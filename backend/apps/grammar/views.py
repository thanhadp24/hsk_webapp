from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from .models import GrammarPoint
from .serializers import GrammarPointDetailSerializer, GrammarPointSerializer


class GrammarPointViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    search_fields = ("title", "structure", "meaning_vi", "explanation")
    ordering_fields = ("order_number", "title", "created_at")
    ordering = ("order_number", "id")

    def get_queryset(self):
        queryset = (
            GrammarPoint.objects.filter(status=True)
            .select_related("level_hsk", "topic")
            .prefetch_related("examples")
        )
        level_hsk_id = self.request.query_params.get("level_hsk_id")
        topic_id = self.request.query_params.get("topic_id")

        if level_hsk_id:
            queryset = queryset.filter(level_hsk_id=level_hsk_id)
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)

        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return GrammarPointDetailSerializer
        return GrammarPointSerializer
