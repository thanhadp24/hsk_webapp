import csv
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Value
from django.db.models.functions import Replace

from apps.catalog.models import LevelHsk
from apps.visual_learning.models import VisualLearningImage


DEFAULT_DRIVE_IMAGE_URL_TEMPLATE = "https://drive.google.com/uc?export=view&id={file_id}"
FILENAME_FIELDS = ("filename", "file_name", "name", "title")
FILE_ID_FIELDS = ("file_id", "id", "drive_file_id")
URL_FIELDS = ("image_url", "url", "web_content_link", "webContentLink", "web_view_link", "webViewLink")


class Command(BaseCommand):
    help = (
        "Update visual learning image URLs from a Google Drive file-id manifest. "
        "CSV headers can be: filename,file_id or name,id."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "manifest_path",
            help=(
                "CSV or JSON file exported from Google Drive. Relative paths are "
                "resolved from the current directory, project root, then backend root."
            ),
        )
        parser.add_argument(
            "--level",
            required=True,
            help="HSK level name or number to update, for example: 1 or HSK 1.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be updated without writing to the database.",
        )
        parser.add_argument(
            "--ignore-missing",
            action="store_true",
            help="Update matched rows even if some database rows have no matching Drive file.",
        )
        parser.add_argument(
            "--url-template",
            default=DEFAULT_DRIVE_IMAGE_URL_TEMPLATE,
            help=(
                "Template used to build image_url from file_id. "
                "Must contain {file_id}. Default: %(default)s"
            ),
        )

    def handle(self, *args, **options):
        manifest_path = self.resolve_manifest_path(options["manifest_path"])
        level = self.resolve_level(options["level"])
        entries = self.load_manifest(manifest_path, options["url_template"])

        rows = list(
            VisualLearningImage.objects.filter(level_hsk=level)
            .order_by("order_number", "id")
        )
        if not rows:
            raise CommandError(f"No visual learning images found for {level.name}.")

        updates = []
        missing = []
        used_filenames = set()

        for row in rows:
            current_filename = self.filename_from_url(row.image_url)
            entry = entries["by_filename"].get(current_filename)
            if entry is None:
                entry = entries["by_order"].get(row.order_number)

            if entry is None:
                missing.append(
                    {
                        "id": row.id,
                        "order_number": row.order_number,
                        "filename": current_filename or "",
                        "current_url": row.image_url,
                    }
                )
                continue

            used_filenames.add(entry["filename"])
            if row.image_url != entry["image_url"]:
                updates.append((row, entry))

        unused = [
            entry
            for entry in entries["items"]
            if entry["filename"] not in used_filenames
        ]

        self.stdout.write(
            "Manifest: {manifest}; level: {level}; db rows: {rows}; matched: {matched}; "
            "to update: {updates}; missing: {missing}; unused manifest rows: {unused}".format(
                manifest=manifest_path,
                level=level.name,
                rows=len(rows),
                matched=len(rows) - len(missing),
                updates=len(updates),
                missing=len(missing),
                unused=len(unused),
            )
        )

        for row, entry in updates[:10]:
            self.stdout.write(
                f"{row.order_number:03d}: {self.filename_from_url(row.image_url)} -> {entry['image_url']}"
            )
        if len(updates) > 10:
            self.stdout.write(f"... and {len(updates) - 10} more update(s).")

        if missing:
            sample = ", ".join(
                f"{item['order_number']:03d}:{item['filename'] or 'unknown'}"
                for item in missing[:10]
            )
            message = f"Missing Drive mapping for {len(missing)} row(s): {sample}"
            if not options["ignore_missing"]:
                raise CommandError(message + ". Use --ignore-missing to update matched rows only.")
            self.stdout.write(self.style.WARNING(message))

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("Dry run only. No database rows were changed."))
            return

        with transaction.atomic():
            for row, entry in updates:
                row.image_url = entry["image_url"]
                row.save(update_fields=["image_url", "updated_at"])

        self.stdout.write(self.style.SUCCESS(f"Updated {len(updates)} visual image URL(s)."))

    def resolve_manifest_path(self, raw_path):
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

        searched = "\n".join(str(candidate.resolve()) for candidate in candidates)
        raise CommandError(f"Manifest file not found. Searched:\n{searched}")

    def resolve_level(self, raw_level):
        raw_level = str(raw_level).strip()
        match = re.search(r"(\d+)", raw_level)
        if not match:
            raise CommandError("--level must contain a number, for example: 1 or HSK 1.")

        level_number = int(match.group(1))
        level_name = f"HSK {level_number}"
        normalized_level_name = level_name.replace(" ", "").lower()

        matches = list(
            LevelHsk.objects.annotate(
                normalized_name=Replace("name", Value(" "), Value(""))
            )
            .filter(normalized_name__iexact=normalized_level_name)
            .order_by("id")
        )
        if not matches:
            matches = list(LevelHsk.objects.filter(order_number=level_number).order_by("id"))

        if len(matches) == 1:
            return matches[0]

        if len(matches) > 1:
            choices = ", ".join(f"id={level.id}, name={level.name!r}" for level in matches[:10])
            raise CommandError(f"Multiple HSK levels match {raw_level!r}: {choices}")

        existing_levels = ", ".join(
            f"id={level.id}, name={level.name!r}, order={level.order_number}"
            for level in LevelHsk.objects.order_by("order_number", "id")[:20]
        )
        raise CommandError(
            f"HSK level not found for {raw_level!r}. Existing levels: {existing_levels or 'none'}"
        )

    def load_manifest(self, manifest_path, url_template):
        if "{file_id}" not in url_template:
            raise CommandError("--url-template must contain {file_id}.")

        raw_rows = self.read_manifest_rows(manifest_path)
        items = []

        for index, row in enumerate(raw_rows, start=1):
            filename = self.pick_value(row, FILENAME_FIELDS)
            file_id = self.pick_value(row, FILE_ID_FIELDS)
            source_url = self.pick_value(row, URL_FIELDS)

            if not filename:
                raise CommandError(f"Manifest row #{index} is missing a filename/name field.")

            filename = Path(str(filename).strip()).name
            if not file_id:
                file_id = self.extract_drive_file_id(source_url)

            if file_id:
                image_url = url_template.format(file_id=file_id)
            elif source_url:
                image_url = str(source_url).strip()
            else:
                raise CommandError(
                    f"Manifest row #{index} ({filename}) is missing file_id/id or URL."
                )

            items.append(
                {
                    "filename": filename,
                    "order_number": self.resolve_order_number(filename),
                    "file_id": file_id,
                    "image_url": image_url,
                }
            )

        by_filename = {}
        by_order = {}
        for item in items:
            normalized_filename = item["filename"].lower()
            if normalized_filename in by_filename:
                raise CommandError(f"Duplicate filename in manifest: {item['filename']}")
            by_filename[normalized_filename] = item

            order_number = item["order_number"]
            if order_number in by_order:
                raise CommandError(f"Duplicate order number in manifest: {order_number}")
            by_order[order_number] = item

        return {
            "items": items,
            "by_filename": by_filename,
            "by_order": by_order,
        }

    def read_manifest_rows(self, manifest_path):
        suffix = manifest_path.suffix.lower()
        if suffix == ".json":
            with manifest_path.open("r", encoding="utf-8-sig") as file:
                data = json.load(file)
            if isinstance(data, dict):
                if "files" in data:
                    data = data["files"]
                else:
                    data = [
                        {"filename": filename, "file_id": file_id}
                        for filename, file_id in data.items()
                    ]
            if not isinstance(data, list):
                raise CommandError("JSON manifest must be an array, object map, or object with a files array.")
            return data

        with manifest_path.open("r", encoding="utf-8-sig", newline="") as file:
            return list(csv.DictReader(file))

    def pick_value(self, row, fields):
        for field in fields:
            value = row.get(field)
            if value not in (None, ""):
                return str(value).strip()
        return ""

    def extract_drive_file_id(self, url):
        if not url:
            return ""

        parsed = urlparse(str(url).strip())
        query = parse_qs(parsed.query)
        if query.get("id"):
            return query["id"][0]

        match = re.search(r"/file/d/([^/]+)", parsed.path)
        if match:
            return unquote(match.group(1))

        return ""

    def filename_from_url(self, url):
        if not url:
            return ""
        parsed = urlparse(str(url))
        filename = Path(unquote(parsed.path)).name
        return filename.lower()

    def resolve_order_number(self, filename):
        match = re.search(r"(\d+)(?=\.[^.]+$)", filename)
        if not match:
            raise CommandError(f"Cannot infer order number from file name: {filename}")
        return int(match.group(1))
