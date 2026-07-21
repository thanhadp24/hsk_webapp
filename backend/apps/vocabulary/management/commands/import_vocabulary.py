import json
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from apps.catalog.models import LevelHsk, Topic
from apps.vocabulary.models import Vocabulary, VocabularyExample


DEFAULT_JSON_DIR = Path("data") / "hsk_level updated"
DEFAULT_JSON_FILE_NAME = "hsk6_vocabulary_completed.json"


class Command(BaseCommand):
    help = "Import vocabulary data from a JSON file that follows data/vocabulary_import_template.json."

    required_word_fields = {
        "hsk_level",
        "simplified",
        "pinyin",
        "meaning_vi",
        "word_type",
    }
    required_example_fields = {"sentence_chinese", "pinyin", "meaning_vi"}

    def add_arguments(self, parser):
        parser.add_argument(
            "json_path",
            nargs="?",
            default=str(DEFAULT_JSON_DIR / DEFAULT_JSON_FILE_NAME),
            help=(
                "Path to the JSON file. If omitted, the command uses "
                f"{DEFAULT_JSON_DIR / DEFAULT_JSON_FILE_NAME}. Relative paths are "
                "resolved from the current directory, project root, then backend root."
            ),
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and show what would be imported without writing to the database.",
        )
        parser.add_argument(
            "--keep-existing-examples",
            action="store_true",
            help="Keep old examples for updated vocabularies instead of replacing them.",
        )

    def handle(self, *args, **options):
        json_path = self.resolve_json_path(options["json_path"])
        data = self.load_json(json_path)
        self.validate_data(data, json_path)

        if options["dry_run"]:
            self.stdout.write(
                self.style.WARNING(
                    f"Dry run OK: {json_path} contains {len(data)} vocabulary items."
                )
            )
            return

        stats = {
            "levels_created": 0,
            "topics_created": 0,
            "vocab_created": 0,
            "vocab_updated": 0,
            "examples_created": 0,
        }

        with transaction.atomic():
            topic_order_cache = self.get_next_topic_order()

            for index, item in enumerate(data, start=1):
                level, level_created = self.get_or_create_level(item["hsk_level"])
                if level_created:
                    stats["levels_created"] += 1

                topic = None
                topic_name = self.clean_text(item.get("topic"))
                if topic_name:
                    topic, topic_created = self.get_or_create_topic(
                        topic_name, topic_order_cache
                    )
                    if topic_created:
                        stats["topics_created"] += 1

                vocabulary, created = self.upsert_vocabulary(item, level, topic, index)
                if created:
                    stats["vocab_created"] += 1
                else:
                    stats["vocab_updated"] += 1

                if not options["keep_existing_examples"]:
                    vocabulary.examples.all().delete()

                examples = self.build_examples(vocabulary, item.get("examples", []))
                if examples:
                    VocabularyExample.objects.bulk_create(examples)
                    stats["examples_created"] += len(examples)

        self.stdout.write(self.style.SUCCESS(f"Imported vocabulary from {json_path}"))
        self.stdout.write(
            "Levels created: {levels_created}; topics created: {topics_created}; "
            "vocab created: {vocab_created}; vocab updated: {vocab_updated}; "
            "examples created: {examples_created}".format(**stats)
        )

    def resolve_json_path(self, raw_path):
        path = Path(raw_path).expanduser()
        candidates = [path]

        if not path.is_absolute():
            candidates = [
                Path.cwd() / path,
                Path(settings.ROOT_DIR) / path,
                Path(settings.BASE_DIR) / path,
            ]

        for candidate in candidates:
            resolved = candidate.resolve()
            if resolved.is_file():
                return resolved

        checked = ", ".join(str(candidate.resolve()) for candidate in candidates)
        raise CommandError(f"JSON file not found. Checked: {checked}")

    def load_json(self, json_path):
        try:
            with json_path.open("r", encoding="utf-8-sig") as file:
                return json.load(file)
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON in {json_path}: {exc}") from exc
        except OSError as exc:
            raise CommandError(f"Cannot read {json_path}: {exc}") from exc

    def validate_data(self, data, json_path):
        if not isinstance(data, list):
            raise CommandError(f"{json_path} must contain a JSON array.")

        for index, item in enumerate(data, start=1):
            if not isinstance(item, dict):
                raise CommandError(f"Item #{index} must be an object.")

            missing = [
                field
                for field in sorted(self.required_word_fields)
                if not self.clean_text(item.get(field))
            ]
            if missing:
                raise CommandError(
                    f"Item #{index} is missing required field(s): {', '.join(missing)}"
                )

            examples = item.get("examples", [])
            if examples is None:
                continue
            if not isinstance(examples, list):
                raise CommandError(f"Item #{index} field 'examples' must be a list.")

            for example_index, example in enumerate(examples, start=1):
                if not isinstance(example, dict):
                    raise CommandError(
                        f"Example #{example_index} of item #{index} must be an object."
                    )

                missing_example_fields = [
                    field
                    for field in sorted(self.required_example_fields)
                    if not self.clean_text(example.get(field))
                ]
                if missing_example_fields:
                    raise CommandError(
                        "Example #{example_index} of item #{index} is missing "
                        "required field(s): {fields}".format(
                            example_index=example_index,
                            index=index,
                            fields=", ".join(missing_example_fields),
                        )
                    )

    def get_or_create_level(self, level_name):
        normalized_name = self.clean_text(level_name)
        order_number = self.extract_hsk_order(normalized_name)
        return LevelHsk.objects.get_or_create(
            name=normalized_name,
            defaults={
                "description": "",
                "order_number": order_number,
                "status": True,
            },
        )

    def get_or_create_topic(self, topic_name, topic_order_cache):
        topic = Topic.objects.filter(name=topic_name).first()
        if topic:
            return topic, False

        topic_order_cache["next"] += 1
        return Topic.objects.create(
            name=topic_name,
            slug=self.make_unique_topic_slug(topic_name),
            description="",
            thumbnail_url="",
            order_number=topic_order_cache["next"],
            status=True,
        ), True

    def get_next_topic_order(self):
        last_topic = Topic.objects.order_by("-order_number").first()
        return {"next": last_topic.order_number if last_topic else 0}

    def upsert_vocabulary(self, item, level, topic, index):
        lookup = {
            "level_hsk": level,
            "simplified": self.clean_text(item["simplified"]),
            "pinyin": self.clean_text(item["pinyin"]),
        }
        order_number = self.safe_int(item.get("order_number"), index)
        defaults = {
            "topic": topic,
            "traditional": self.clean_nullable_text(item.get("traditional")),
            "meaning_vi": self.clean_text(item["meaning_vi"]),
            "word_type": self.clean_text(item["word_type"]),
            "audio_url": self.clean_nullable_text(item.get("audio_url")),
            "image_url": self.clean_nullable_text(item.get("image_url")),
            "note": self.clean_nullable_text(item.get("note")),
            "order_number": order_number,
            "han_viet": self.clean_nullable_text(item.get("han_viet")),
            "status": True,
        }

        matches = Vocabulary.objects.filter(**lookup)
        if matches.count() > 1:
            matches = matches.filter(order_number=order_number)
        if matches.count() > 1:
            raise CommandError(
                "Multiple vocabularies match HSK='{level}', simplified='{word}', "
                "pinyin='{pinyin}', order_number={order}.".format(
                    level=level.name,
                    word=lookup["simplified"],
                    pinyin=lookup["pinyin"],
                    order=order_number,
                )
            )

        vocabulary = matches.first()
        if vocabulary:
            for field, value in defaults.items():
                setattr(vocabulary, field, value)
            vocabulary.save()
            return vocabulary, False

        vocabulary = Vocabulary.objects.create(**lookup, **defaults)
        return vocabulary, True

    def build_examples(self, vocabulary, examples):
        return [
            VocabularyExample(
                vocabulary=vocabulary,
                sentence_chinese=self.clean_text(example["sentence_chinese"]),
                pinyin=self.clean_text(example["pinyin"]),
                meaning_vi=self.clean_text(example["meaning_vi"]),
                audio_url=self.clean_nullable_text(example.get("audio_url")),
                order_number=self.safe_int(example.get("order_number"), index),
            )
            for index, example in enumerate(examples or [], start=1)
        ]

    def make_unique_topic_slug(self, topic_name):
        base_slug = slugify(topic_name) or "topic"
        slug = base_slug
        counter = 2
        while Topic.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    def extract_hsk_order(self, level_name):
        match = re.search(r"\d+", level_name)
        return int(match.group()) if match else 0

    def safe_int(self, value, default):
        if value in (None, ""):
            return default
        try:
            return int(value)
        except (TypeError, ValueError) as exc:
            raise CommandError(f"Expected integer, got {value!r}") from exc

    def clean_text(self, value):
        if value is None:
            return ""
        return str(value).strip()

    def clean_nullable_text(self, value):
        value = self.clean_text(value)
        return value or None
