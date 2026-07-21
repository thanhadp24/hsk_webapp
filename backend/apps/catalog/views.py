from django.db.models import Count, Q
from rest_framework import viewsets

from .models import LevelHsk, Topic
from .serializers import LevelHskSerializer, TopicSerializer


class LevelHskViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LevelHsk.objects.filter(status=True)
    serializer_class = LevelHskSerializer
    search_fields = ("name", "description")
    ordering_fields = ("order_number", "name")


class TopicViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TopicSerializer
    search_fields = ("name", "description")
    ordering_fields = ("order_number", "name")

    def get_queryset(self):
        queryset = Topic.objects.filter(status=True).annotate(
            vocabulary_count=Count(
                "vocabularies",
                filter=Q(vocabularies__status=True),
                distinct=True,
            ),
            grammar_count=Count(
                "grammar_points",
                filter=Q(grammar_points__status=True),
                distinct=True,
            ),
            exercise_count=Count(
                "exercise_sets",
                filter=Q(exercise_sets__status=True),
                distinct=True,
            ),
        )

        level_hsk_id = self.request.query_params.get("level_hsk_id")
        content_type = self.request.query_params.get("content_type")

        if level_hsk_id:
            queryset = queryset.filter(
                Q(vocabularies__level_hsk_id=level_hsk_id, vocabularies__status=True)
                | Q(grammar_points__level_hsk_id=level_hsk_id, grammar_points__status=True)
                | Q(exercise_sets__level_hsk_id=level_hsk_id, exercise_sets__status=True)
            )

        if content_type == "VISUAL_LEARNING":
            return queryset.none()

        content_filter_map = {
            "VOCABULARY": "vocabulary_count__gt",
            "GRAMMAR": "grammar_count__gt",
            "EXERCISE": "exercise_count__gt",
        }
        if content_type in content_filter_map:
            queryset = queryset.filter(**{content_filter_map[content_type]: 0})

        return queryset.distinct()

