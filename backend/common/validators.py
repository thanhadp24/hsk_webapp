from django.core.exceptions import ValidationError


def validate_hsk_level(value: int) -> None:
    if value < 1 or value > 6:
        raise ValidationError("HSK level must be between 1 and 6.")
