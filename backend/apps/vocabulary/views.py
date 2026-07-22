from django.db.models import BooleanField, Exists, OuterRef, Value
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .models import UserSavedVocabulary, Vocabulary
from .serializers import (
    VocabularyDetailSerializer,
    VocabularyFlashcardSerializer,
    VocabularyListSerializer,
)


class VocabularyViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = VocabularyListSerializer
    search_fields = ("simplified", "traditional", "pinyin", "meaning_vi", "han_viet")
    ordering_fields = ("order_number", "simplified", "created_at")
    ordering = ("order_number", "id")

    def get_queryset(self):
        queryset = Vocabulary.objects.filter(status=True)

        if self.action == "retrieve":
            queryset = queryset.select_related("level_hsk", "topic").prefetch_related("examples")
        elif self.action == "flashcards":
            queryset = queryset.select_related("level_hsk", "topic").prefetch_related("examples")
        else:
            queryset = queryset.only(
                "id",
                "level_hsk_id",
                "topic_id",
                "simplified",
                "traditional",
                "pinyin",
                "meaning_vi",
                "han_viet",
                "word_type",
                "audio_url",
                "order_number",
                "created_at",
                "status",
            )

        level_hsk_id = self.request.query_params.get("level_hsk_id")
        topic_id = self.request.query_params.get("topic_id")
        word_type = self.request.query_params.get("word_type")

        if level_hsk_id:
            queryset = queryset.filter(level_hsk_id=level_hsk_id)
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)
        if word_type:
            queryset = queryset.filter(word_type=word_type)

        if self.request.user.is_authenticated:
            saved = UserSavedVocabulary.objects.filter(
                user=self.request.user, vocabulary_id=OuterRef("pk")
            )
            queryset = queryset.annotate(is_saved=Exists(saved))

        return queryset

    def get_serializer_class(self):
        if self.action == "flashcards":
            return VocabularyFlashcardSerializer
        if self.action == "retrieve":
            return VocabularyDetailSerializer
        return VocabularyListSerializer

    @action(detail=False, methods=["get"], url_path="flashcards")
    def flashcards(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        limit = min(int(request.query_params.get("limit", 50)), 100)
        serializer = self.get_serializer(queryset[:limit], many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post", "delete"], permission_classes=[IsAuthenticated])
    def save(self, request, pk=None):
        vocabulary = self.get_object()
        if request.method == "POST":
            UserSavedVocabulary.objects.get_or_create(
                user=request.user, vocabulary=vocabulary
            )
            return Response(status=status.HTTP_201_CREATED)

        UserSavedVocabulary.objects.filter(
            user=request.user, vocabulary=vocabulary
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SavedVocabularyViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = VocabularyListSerializer
    search_fields = ("simplified", "pinyin", "meaning_vi")
    ordering_fields = ("order_number", "simplified", "created_at")
    ordering = ("order_number", "id")

    def get_queryset(self):
        saved_ids = UserSavedVocabulary.objects.filter(user=self.request.user).values(
            "vocabulary_id"
        )
        return (
            Vocabulary.objects.filter(id__in=saved_ids, status=True)
            .only(
                "id",
                "level_hsk_id",
                "topic_id",
                "simplified",
                "traditional",
                "pinyin",
                "meaning_vi",
                "han_viet",
                "word_type",
                "audio_url",
                "order_number",
                "created_at",
                "status",
            )
            .annotate(is_saved=Value(True, output_field=BooleanField()))
        )
