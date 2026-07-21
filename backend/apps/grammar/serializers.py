from rest_framework import serializers
from django.db.models import Q

from apps.catalog.serializers import LevelHskSerializer, TopicSerializer

from .models import GrammarExample, GrammarPoint


class GrammarExampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrammarExample
        fields = (
            "id",
            "sentence_chinese",
            "pinyin",
            "meaning_vi",
            "explanation",
            "audio_url",
            "order_number",
        )


class GrammarPointSerializer(serializers.ModelSerializer):
    level_hsk = LevelHskSerializer(read_only=True)
    topic = TopicSerializer(read_only=True)

    class Meta:
        model = GrammarPoint
        fields = (
            "id",
            "level_hsk",
            "topic",
            "title",
            "structure",
            "meaning_vi",
            "explanation",
            "note",
            "image_url",
            "order_number",
        )


class GrammarPointDetailSerializer(GrammarPointSerializer):
    examples = GrammarExampleSerializer(many=True, read_only=True)
    previous_id = serializers.SerializerMethodField()
    next_id = serializers.SerializerMethodField()

    class Meta(GrammarPointSerializer.Meta):
        fields = GrammarPointSerializer.Meta.fields + ("examples", "previous_id", "next_id")

    def get_ordered_siblings(self, obj):
        queryset = GrammarPoint.objects.filter(
            status=True,
            level_hsk=obj.level_hsk,
        )
        if obj.topic_id:
            queryset = queryset.filter(topic_id=obj.topic_id)
        else:
            queryset = queryset.filter(topic__isnull=True)
        return queryset.order_by("order_number", "id")

    def get_previous_id(self, obj):
        sibling = (
            self.get_ordered_siblings(obj)
            .filter(Q(order_number__lt=obj.order_number) | Q(order_number=obj.order_number, id__lt=obj.id))
            .order_by("-order_number", "-id")
            .first()
        )
        return sibling.id if sibling else None

    def get_next_id(self, obj):
        sibling = (
            self.get_ordered_siblings(obj)
            .filter(Q(order_number__gt=obj.order_number) | Q(order_number=obj.order_number, id__gt=obj.id))
            .first()
        )
        return sibling.id if sibling else None
