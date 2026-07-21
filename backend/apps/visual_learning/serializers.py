from rest_framework import serializers

from apps.catalog.serializers import LevelHskSerializer

from .models import VisualLearningImage


class VisualLearningImageSerializer(serializers.ModelSerializer):
    level_hsk = LevelHskSerializer(read_only=True)

    class Meta:
        model = VisualLearningImage
        fields = (
            "id",
            "level_hsk",
            "image_url",
            "order_number",
        )
