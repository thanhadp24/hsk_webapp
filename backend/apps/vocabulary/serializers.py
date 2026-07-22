from rest_framework import serializers
from django.db.models import Q

from apps.catalog.serializers import LevelHskSerializer, TopicSerializer

from .models import UserSavedVocabulary, Vocabulary, VocabularyExample


class VocabularyExampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = VocabularyExample
        fields = ("id", "sentence_chinese", "pinyin", "meaning_vi", "audio_url", "order_number")


class VocabularySerializer(serializers.ModelSerializer):
    level_hsk = LevelHskSerializer(read_only=True)
    topic = TopicSerializer(read_only=True)
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = Vocabulary
        fields = (
            "id",
            "level_hsk",
            "topic",
            "simplified",
            "traditional",
            "pinyin",
            "meaning_vi",
            "han_viet",
            "word_type",
            "audio_url",
            "image_url",
            "note",
            "order_number",
            "is_saved",
        )

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return getattr(obj, "is_saved", None) or UserSavedVocabulary.objects.filter(
            user=request.user, vocabulary=obj
        ).exists()


class VocabularyListSerializer(serializers.ModelSerializer):
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = Vocabulary
        fields = (
            "id",
            "simplified",
            "traditional",
            "pinyin",
            "meaning_vi",
            "han_viet",
            "word_type",
            "audio_url",
            "order_number",
            "is_saved",
        )

    def get_is_saved(self, obj):
        return bool(getattr(obj, "is_saved", False))


class VocabularyDetailSerializer(VocabularySerializer):
    examples = VocabularyExampleSerializer(many=True, read_only=True)
    previous_id = serializers.SerializerMethodField()
    next_id = serializers.SerializerMethodField()

    class Meta(VocabularySerializer.Meta):
        fields = VocabularySerializer.Meta.fields + ("examples", "previous_id", "next_id")

    def get_ordered_siblings(self, obj):
        queryset = Vocabulary.objects.filter(
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


class VocabularyFlashcardSerializer(VocabularySerializer):
    examples = VocabularyExampleSerializer(many=True, read_only=True)

    class Meta(VocabularySerializer.Meta):
        fields = VocabularySerializer.Meta.fields + ("examples",)
