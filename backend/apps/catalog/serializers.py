from rest_framework import serializers

from .models import LevelHsk, Topic


class LevelHskSerializer(serializers.ModelSerializer):
    class Meta:
        model = LevelHsk
        fields = (
            "id",
            "name",
            "description",
            "order_number",
            "status",
        )


class TopicSerializer(serializers.ModelSerializer):
    vocabulary_count = serializers.IntegerField(read_only=True, default=0)
    grammar_count = serializers.IntegerField(read_only=True, default=0)
    exercise_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Topic
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "thumbnail_url",
            "order_number",
            "status",
            "vocabulary_count",
            "grammar_count",
            "exercise_count",
        )

