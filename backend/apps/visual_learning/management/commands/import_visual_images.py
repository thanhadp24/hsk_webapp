import os
import re
import shutil
from urllib.parse import urlparse
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.catalog.models import LevelHsk
from apps.visual_learning.models import VisualLearningImage


DEFAULT_HSK_FOLDER = "hsk4"
DEFAULT_IMAGE_ROOT = Path("data") / "hsk_level updated" / "image"
DEFAULT_IMAGE_DIR = DEFAULT_IMAGE_ROOT / DEFAULT_HSK_FOLDER
DEFAULT_LOCAL_MEDIA_ORIGIN = "http://localhost:8000"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


class Command(BaseCommand):
    help = (
        "Import visual learning images from a numbered HSK image folder. "
        "Example: python manage.py import_visual_images \"../data/hsk_level updated/image/hsk1\""
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "image_dir",
            nargs="?",
            default=str(DEFAULT_IMAGE_DIR),
            help=(
                "Folder containing images such as hsk1_001.png. Relative paths are "
                "resolved from the current directory, project root, then backend root. "
                f"If omitted, the command uses {DEFAULT_IMAGE_DIR}; change DEFAULT_HSK_FOLDER "
                "inside this command file to import another HSK folder without changing the command."
            ),
        )
        parser.add_argument(
            "--level",
            help="HSK level name or number. If omitted, inferred from folder/file name, e.g. hsk1 -> HSK 1.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be imported without copying files or writing to the database.",
        )
        parser.add_argument(
            "--no-copy",
            action="store_true",
            help="Do not copy files to MEDIA_ROOT; store URLs from --url-prefix plus filename instead.",
        )
        parser.add_argument(
            "--url-prefix",
            default=None,
            help=(
                "URL prefix used for image_url. Defaults to /media/visual_learning/<hsk-folder>/ "
                "with a local backend origin when copying, or the source folder path when --no-copy is used."
            ),
        )

    def handle(self, *args, **options):
        image_dir = self.resolve_image_dir(options["image_dir"])
        image_files = self.collect_images(image_dir)
        level_number = self.resolve_level_number(options.get("level"), image_dir, image_files)
        level_name = f"HSK {level_number}"
        destination_folder = f"hsk{level_number}"
        destination_dir = Path(settings.MEDIA_ROOT) / "visual_learning" / destination_folder
        url_prefix = self.resolve_url_prefix(options.get("url_prefix"), destination_folder, options["no_copy"], image_dir)

        rows = [
            {
                "source_path": image_path,
                "target_path": destination_dir / image_path.name,
                "image_url": f"{url_prefix}/{image_path.name}",
                "order_number": self.resolve_order_number(image_path),
            }
            for image_path in image_files
        ]

        duplicate_orders = self.find_duplicate_orders(rows)
        if duplicate_orders:
            duplicates = ", ".join(str(order) for order in duplicate_orders)
            raise CommandError(f"Duplicate image order numbers found: {duplicates}")

        if options["dry_run"]:
            self.stdout.write(
                self.style.WARNING(
                    f"Dry run OK: {image_dir} contains {len(rows)} images for {level_name}."
                )
            )
            for row in rows:
                self.stdout.write(f"{row['order_number']:03d}: {row['image_url']}")
            return

        stats = {"created": 0, "updated": 0, "copied": 0}

        with transaction.atomic():
            level, _ = LevelHsk.objects.get_or_create(
                name=level_name,
                defaults={
                    "description": f"HSK level {level_number}",
                    "order_number": level_number,
                    "status": True,
                },
            )

            if not options["no_copy"]:
                destination_dir.mkdir(parents=True, exist_ok=True)

            for row in rows:
                if not options["no_copy"]:
                    shutil.copy2(row["source_path"], row["target_path"])
                    stats["copied"] += 1

                visual_image, created = self.upsert_visual_image(level, row)
                if created:
                    stats["created"] += 1
                else:
                    stats["updated"] += 1

        self.stdout.write(self.style.SUCCESS(f"Imported visual learning images from {image_dir}"))
        self.stdout.write(
            "Level: {level}; copied: {copied}; created: {created}; updated: {updated}".format(
                level=level_name,
                copied=stats["copied"],
                created=stats["created"],
                updated=stats["updated"],
            )
        )

    def resolve_image_dir(self, raw_path):
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
            if resolved.is_dir():
                return resolved

        searched = "\n".join(str(candidate.resolve()) for candidate in candidates)
        raise CommandError(f"Image directory not found. Searched:\n{searched}")

    def collect_images(self, image_dir):
        image_files = [
            path
            for path in image_dir.iterdir()
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        ]
        image_files.sort(key=lambda path: (self.resolve_order_number(path), path.name.lower()))

        if not image_files:
            raise CommandError(f"No image files found in {image_dir}")

        return image_files

    def resolve_level_number(self, raw_level, image_dir, image_files):
        if raw_level:
            match = re.search(r"(\d+)", raw_level)
            if match:
                return int(match.group(1))
            raise CommandError("--level must contain a number, for example: 1 or HSK 1")

        candidates = [image_dir.name, *(image.name for image in image_files[:3])]
        for candidate in candidates:
            match = re.search(r"hsk[\s_-]*(\d+)", candidate, flags=re.IGNORECASE)
            if match:
                return int(match.group(1))

        raise CommandError("Cannot infer HSK level. Pass --level 1, --level 2, etc.")

    def resolve_order_number(self, image_path):
        match = re.search(r"(\d+)(?=\.[^.]+$)", image_path.name)
        if not match:
            raise CommandError(f"Cannot infer order number from file name: {image_path.name}")
        return int(match.group(1))

    def resolve_url_prefix(self, raw_prefix, destination_folder, no_copy, image_dir):
        if raw_prefix:
            return raw_prefix.rstrip("/")

        if no_copy:
            return image_dir.as_posix().rstrip("/")

        media_url = f"/{str(settings.MEDIA_URL).strip('/')}"
        media_origin = self.resolve_media_origin()
        return f"{media_origin}{media_url}/visual_learning/{destination_folder}".rstrip("/")

    def resolve_media_origin(self):
        public_media_origin = getattr(settings, "PUBLIC_MEDIA_ORIGIN", None)
        if public_media_origin:
            return str(public_media_origin).rstrip("/")

        api_url = os.getenv("NEXT_PUBLIC_API_URL")
        if api_url:
            parsed = urlparse(str(api_url))
            if parsed.scheme and parsed.netloc:
                return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")

        return DEFAULT_LOCAL_MEDIA_ORIGIN

    def find_duplicate_orders(self, rows):
        seen = set()
        duplicates = set()
        for row in rows:
            order_number = row["order_number"]
            if order_number in seen:
                duplicates.add(order_number)
            seen.add(order_number)
        return sorted(duplicates)

    def upsert_visual_image(self, level, row):
        queryset = VisualLearningImage.objects.filter(
            level_hsk=level,
            order_number=row["order_number"],
        ).order_by("id")
        visual_image = queryset.first()

        if visual_image is None:
            return VisualLearningImage.objects.create(
                level_hsk=level,
                image_url=row["image_url"],
                order_number=row["order_number"],
                status=True,
            ), True

        queryset.exclude(id=visual_image.id).delete()
        visual_image.image_url = row["image_url"]
        visual_image.status = True
        visual_image.save(update_fields=["image_url", "status", "updated_at"])
        return visual_image, False
