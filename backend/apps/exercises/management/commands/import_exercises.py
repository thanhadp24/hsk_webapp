import json
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from apps.catalog.models import LevelHsk, Topic
from apps.exercises.models import (
    ExerciseContentType,
    ExerciseMode,
    ExerciseSection,
    ExerciseSectionType,
    ExerciseSet,
    Question,
    QuestionGroup,
    QuestionOption,
    QuestionType,
)


DEFAULT_JSON_FILE = (
    Path("data") / "hsk_level updated" / "dethi" / "import" / "hsk4_de1.json"
)


class Command(BaseCommand):
    help = "Import exercise sets from a JSON file into the exercises tables."

    required_exercise_fields = {
        "hsk_level",
        "title",
        "content_type",
        "exercise_mode",
        "passing_score",
    }
    required_section_fields = {"title", "section_type", "order_number"}
    required_question_fields = {"question_type", "question_text", "score", "order_number"}

    def add_arguments(self, parser):
        parser.add_argument(
            "json_path",
            nargs="?",
            default=str(DEFAULT_JSON_FILE),
            help=(
                "Path to the JSON file. Relative paths are resolved from the "
                "current directory, project root, then backend root."
            ),
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and show what would be imported without writing to DB.",
        )
        parser.add_argument(
            "--replace",
            action="store_true",
            help=(
                "If an exercise set with the same HSK level and title exists, "
                "delete only its sections/groups/questions/options and import again."
            ),
        )

    def handle(self, *args, **options):
        json_path = self.resolve_json_path(options["json_path"])
        data = self.load_json(json_path)
        self.validate_data(data, json_path)

        stats = self.collect_stats(data)
        if options["dry_run"]:
            self.stdout.write(self.style.WARNING(f"Dry run OK: {json_path}"))
            self.stdout.write(self.format_stats(stats))
            return

        import_stats = {
            "levels_created": 0,
            "topics_created": 0,
            "exercise_sets_created": 0,
            "exercise_sets_replaced": 0,
            "sections_created": 0,
            "groups_created": 0,
            "questions_created": 0,
            "options_created": 0,
        }

        with transaction.atomic():
            topic_order_cache = self.get_next_topic_order()

            for index, item in enumerate(data, start=1):
                level, level_created = self.get_or_create_level(item["hsk_level"])
                if level_created:
                    import_stats["levels_created"] += 1

                topic = None
                topic_name = self.clean_text(item.get("topic"))
                if topic_name:
                    topic, topic_created = self.get_or_create_topic(
                        topic_name, topic_order_cache
                    )
                    if topic_created:
                        import_stats["topics_created"] += 1

                exercise_set, created, replaced = self.upsert_exercise_set(
                    item=item,
                    level=level,
                    topic=topic,
                    index=index,
                    replace=options["replace"],
                )
                if created:
                    import_stats["exercise_sets_created"] += 1
                if replaced:
                    import_stats["exercise_sets_replaced"] += 1

                created_counts = self.create_children(exercise_set, item)
                for key, value in created_counts.items():
                    import_stats[key] += value

        self.stdout.write(self.style.SUCCESS(f"Imported exercises from {json_path}"))
        self.stdout.write(
            "Levels created: {levels_created}; topics created: {topics_created}; "
            "sets created: {exercise_sets_created}; sets replaced: "
            "{exercise_sets_replaced}; sections: {sections_created}; groups: "
            "{groups_created}; questions: {questions_created}; options: "
            "{options_created}".format(**import_stats)
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
                data = json.load(file)
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON in {json_path}: {exc}") from exc
        except OSError as exc:
            raise CommandError(f"Cannot read {json_path}: {exc}") from exc

        if isinstance(data, dict):
            return [data]
        return data

    def validate_data(self, data, json_path):
        if not isinstance(data, list):
            raise CommandError(f"{json_path} must contain an object or JSON array.")
        if not data:
            raise CommandError(f"{json_path} does not contain any exercise sets.")

        for index, item in enumerate(data, start=1):
            if not isinstance(item, dict):
                raise CommandError(f"Exercise set #{index} must be an object.")

            self.require_fields(item, self.required_exercise_fields, f"Exercise set #{index}")
            self.require_lookup(
                ExerciseContentType, item["content_type"], f"Exercise set #{index}.content_type"
            )
            self.require_lookup(
                ExerciseMode, item["exercise_mode"], f"Exercise set #{index}.exercise_mode"
            )
            self.safe_decimal(item.get("passing_score"), f"Exercise set #{index}.passing_score")

            sections = item.get("sections", [])
            if not isinstance(sections, list):
                raise CommandError(f"Exercise set #{index}.sections must be a list.")

            section_orders = set()
            group_orders = set()
            question_orders = set()

            for section_index, section in enumerate(sections, start=1):
                context = f"Exercise set #{index}, section #{section_index}"
                if not isinstance(section, dict):
                    raise CommandError(f"{context} must be an object.")
                self.require_fields(section, self.required_section_fields, context)
                self.require_lookup(
                    ExerciseSectionType,
                    section["section_type"],
                    f"{context}.section_type",
                )
                section_order = self.safe_int(section.get("order_number"), 0, context)
                self.ensure_unique(section_orders, section_order, f"{context}.order_number")

                groups = section.get("question_groups", [])
                if groups is None:
                    groups = []
                if not isinstance(groups, list):
                    raise CommandError(f"{context}.question_groups must be a list.")

                for group_index, group in enumerate(groups, start=1):
                    group_context = f"{context}, group #{group_index}"
                    if not isinstance(group, dict):
                        raise CommandError(f"{group_context} must be an object.")
                    group_order = self.safe_int(
                        group.get("order_number"), group_index, group_context
                    )
                    self.ensure_unique(
                        group_orders, group_order, f"{group_context}.order_number"
                    )
                    self.validate_questions(
                        questions=group.get("questions", []),
                        question_orders=question_orders,
                        context=group_context,
                    )

                self.validate_questions(
                    questions=section.get("questions", []),
                    question_orders=question_orders,
                    context=context,
                )

    def validate_questions(self, questions, question_orders, context):
        if questions is None:
            return
        if not isinstance(questions, list):
            raise CommandError(f"{context}.questions must be a list.")

        for question_index, question in enumerate(questions, start=1):
            question_context = f"{context}, question #{question_index}"
            if not isinstance(question, dict):
                raise CommandError(f"{question_context} must be an object.")
            self.require_fields(question, self.required_question_fields, question_context)
            self.require_lookup(
                QuestionType, question["question_type"], f"{question_context}.question_type"
            )
            self.safe_decimal(question.get("score"), f"{question_context}.score")
            question_order = self.safe_int(
                question.get("order_number"), question_index, question_context
            )
            self.ensure_unique(
                question_orders, question_order, f"{question_context}.order_number"
            )

            options = question.get("options", [])
            if options is None:
                options = []
            if not isinstance(options, list):
                raise CommandError(f"{question_context}.options must be a list.")

            option_orders = set()
            for option_index, option_item in enumerate(options, start=1):
                option_context = f"{question_context}, option #{option_index}"
                if not isinstance(option_item, dict):
                    raise CommandError(f"{option_context} must be an object.")
                option_order = self.safe_int(
                    option_item.get("order_number"), option_index, option_context
                )
                self.ensure_unique(
                    option_orders, option_order, f"{option_context}.order_number"
                )

    def collect_stats(self, data):
        stats = {
            "exercise_sets": len(data),
            "sections": 0,
            "groups": 0,
            "questions": 0,
            "options": 0,
        }
        for item in data:
            for section in item.get("sections", []) or []:
                stats["sections"] += 1
                for group in section.get("question_groups", []) or []:
                    stats["groups"] += 1
                    for question in group.get("questions", []) or []:
                        stats["questions"] += 1
                        stats["options"] += len(question.get("options", []) or [])
                for question in section.get("questions", []) or []:
                    stats["questions"] += 1
                    stats["options"] += len(question.get("options", []) or [])
        return stats

    def format_stats(self, stats):
        return (
            "Exercise sets: {exercise_sets}; sections: {sections}; groups: "
            "{groups}; questions: {questions}; options: {options}"
        ).format(**stats)

    def upsert_exercise_set(self, item, level, topic, index, replace):
        content_type = self.get_lookup(ExerciseContentType, item["content_type"])
        exercise_mode = self.get_lookup(ExerciseMode, item["exercise_mode"])
        title = self.clean_text(item["title"])
        defaults = {
            "topic": topic,
            "description": self.clean_nullable_text(item.get("description")),
            "content_type": content_type,
            "exercise_mode": exercise_mode,
            "time_limit_minutes": self.safe_nullable_int(item.get("time_limit_minutes")),
            "passing_score": self.safe_decimal(item.get("passing_score"), "passing_score"),
            "order_number": self.safe_int(item.get("order_number"), index, title),
            "status": self.safe_bool(item.get("status"), True),
        }

        existing = ExerciseSet.objects.filter(level_hsk=level, title=title).first()
        if existing and not replace:
            raise CommandError(
                "Exercise set '{title}' for level '{level}' already exists. "
                "Run again with --replace to update only this exercise set.".format(
                    title=title,
                    level=level.name,
                )
            )

        if existing:
            for field, value in defaults.items():
                setattr(existing, field, value)
            existing.save()
            self.delete_existing_children(existing)
            return existing, False, True

        exercise_set = ExerciseSet.objects.create(level_hsk=level, title=title, **defaults)
        return exercise_set, True, False

    def create_children(self, exercise_set, item):
        stats = {
            "sections_created": 0,
            "groups_created": 0,
            "questions_created": 0,
            "options_created": 0,
        }

        for section_data in item.get("sections", []) or []:
            section = self.create_section(exercise_set, section_data)
            stats["sections_created"] += 1

            for group_data in section_data.get("question_groups", []) or []:
                group = self.create_group(exercise_set, section, group_data)
                stats["groups_created"] += 1
                counts = self.create_questions(
                    exercise_set=exercise_set,
                    section=section,
                    group=group,
                    questions=group_data.get("questions", []) or [],
                )
                stats["questions_created"] += counts["questions"]
                stats["options_created"] += counts["options"]

            counts = self.create_questions(
                exercise_set=exercise_set,
                section=section,
                group=None,
                questions=section_data.get("questions", []) or [],
            )
            stats["questions_created"] += counts["questions"]
            stats["options_created"] += counts["options"]

        return stats

    def create_section(self, exercise_set, section_data):
        return ExerciseSection.objects.create(
            exercise_set=exercise_set,
            section_type=self.get_lookup(ExerciseSectionType, section_data["section_type"]),
            title=self.clean_text(section_data["title"]),
            instruction=self.clean_nullable_text(section_data.get("instruction")),
            audio_url=self.clean_nullable_text(section_data.get("audio_url")),
            time_limit_minutes=self.safe_nullable_int(section_data.get("time_limit_minutes")),
            max_score=self.safe_nullable_decimal(section_data.get("max_score")),
            order_number=self.safe_int(
                section_data.get("order_number"), 0, section_data["title"]
            ),
            status=self.safe_bool(section_data.get("status"), True),
        )

    def create_group(self, exercise_set, section, group_data):
        return QuestionGroup.objects.create(
            exercise_set=exercise_set,
            section=section,
            title=self.clean_nullable_text(group_data.get("title")),
            instruction=self.clean_nullable_text(group_data.get("instruction")),
            passage_text=self.clean_nullable_text(group_data.get("passage_text")),
            passage_pinyin=self.clean_nullable_text(group_data.get("passage_pinyin")),
            audio_url=self.clean_nullable_text(group_data.get("audio_url")),
            image_url=self.clean_nullable_text(group_data.get("image_url")),
            start_time_seconds=self.safe_nullable_decimal(
                group_data.get("start_time_seconds")
            ),
            end_time_seconds=self.safe_nullable_decimal(group_data.get("end_time_seconds")),
            order_number=self.safe_int(
                group_data.get("order_number"), 0, group_data.get("title", "group")
            ),
            status=self.safe_bool(group_data.get("status"), True),
        )

    def create_questions(self, exercise_set, section, group, questions):
        stats = {"questions": 0, "options": 0}

        for question_data in questions:
            question = Question.objects.create(
                exercise_set=exercise_set,
                section=section,
                question_group=group,
                question_type=self.get_lookup(QuestionType, question_data["question_type"]),
                question_text=self.clean_text(question_data["question_text"]),
                question_pinyin=self.clean_nullable_text(question_data.get("question_pinyin")),
                image_url=self.clean_nullable_text(question_data.get("image_url")),
                audio_url=self.clean_nullable_text(question_data.get("audio_url")),
                explanation=self.clean_nullable_text(question_data.get("explanation")),
                correct_answer_text=self.clean_nullable_text(
                    question_data.get("correct_answer_text")
                ),
                start_time_seconds=self.safe_nullable_decimal(
                    question_data.get("start_time_seconds")
                ),
                end_time_seconds=self.safe_nullable_decimal(
                    question_data.get("end_time_seconds")
                ),
                score=self.safe_decimal(question_data.get("score"), "question.score"),
                order_number=self.safe_int(
                    question_data.get("order_number"), 0, question_data["question_text"]
                ),
                status=self.safe_bool(question_data.get("status"), True),
            )
            stats["questions"] += 1

            options = [
                QuestionOption(
                    question=question,
                    option_text=self.clean_nullable_text(option_data.get("option_text")),
                    image_url=self.clean_nullable_text(option_data.get("image_url")),
                    audio_url=self.clean_nullable_text(option_data.get("audio_url")),
                    is_correct=self.safe_bool(option_data.get("is_correct"), False),
                    order_number=self.safe_int(
                        option_data.get("order_number"), index, question.question_text
                    ),
                )
                for index, option_data in enumerate(
                    question_data.get("options", []) or [], start=1
                )
            ]
            if options:
                QuestionOption.objects.bulk_create(options)
                stats["options"] += len(options)

        return stats

    def delete_existing_children(self, exercise_set):
        QuestionOption.objects.filter(question__exercise_set=exercise_set).delete()
        Question.objects.filter(exercise_set=exercise_set).delete()
        QuestionGroup.objects.filter(exercise_set=exercise_set).delete()
        ExerciseSection.objects.filter(exercise_set=exercise_set).delete()

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

    def get_lookup(self, model, code):
        return model.objects.get(code=self.clean_text(code))

    def require_lookup(self, model, code, context):
        normalized_code = self.clean_text(code)
        if not normalized_code:
            raise CommandError(f"{context} is required.")
        if not model.objects.filter(code=normalized_code).exists():
            raise CommandError(
                f"{context} references unknown code '{normalized_code}' "
                f"in table {model._meta.db_table}."
            )

    def require_fields(self, item, required_fields, context):
        missing = [
            field
            for field in sorted(required_fields)
            if item.get(field) is None or self.clean_text(item.get(field)) == ""
        ]
        if missing:
            raise CommandError(
                f"{context} is missing required field(s): {', '.join(missing)}"
            )

    def ensure_unique(self, seen_values, value, context):
        if value in seen_values:
            raise CommandError(f"{context} must be unique; duplicated value {value}.")
        seen_values.add(value)

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

    def safe_int(self, value, default, context):
        if value in (None, ""):
            return default
        try:
            return int(value)
        except (TypeError, ValueError) as exc:
            raise CommandError(f"{context}: expected integer, got {value!r}") from exc

    def safe_nullable_int(self, value):
        if value in (None, ""):
            return None
        return self.safe_int(value, 0, "integer field")

    def safe_decimal(self, value, context):
        if value in (None, ""):
            raise CommandError(f"{context}: expected decimal, got empty value.")
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise CommandError(f"{context}: expected decimal, got {value!r}") from exc

    def safe_nullable_decimal(self, value):
        if value in (None, ""):
            return None
        return self.safe_decimal(value, "decimal field")

    def safe_bool(self, value, default):
        if value in (None, ""):
            return default
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "y"}:
                return True
            if normalized in {"0", "false", "no", "n"}:
                return False
        return bool(value)

    def clean_text(self, value):
        if value is None:
            return ""
        return str(value).strip()

    def clean_nullable_text(self, value):
        value = self.clean_text(value)
        return value or None
