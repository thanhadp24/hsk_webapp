from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from .models import VisualLearningImage
from .serializers import VisualLearningImageSerializer


class VisualLearningImageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = VisualLearningImageSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    ordering_fields = ("order_number", "created_at")
    ordering = ("order_number", "id")

    def get_queryset(self):
        queryset = VisualLearningImage.objects.filter(status=True).select_related(
            "level_hsk"
        )
        level_hsk_id = self.request.query_params.get("level_hsk_id")
        if level_hsk_id:
            queryset = queryset.filter(level_hsk_id=level_hsk_id)
        return queryset

