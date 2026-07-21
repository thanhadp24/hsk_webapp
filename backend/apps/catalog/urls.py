from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LevelHskViewSet, TopicViewSet

router = DefaultRouter()
router.register("hsk-levels", LevelHskViewSet, basename="hsk-level")
router.register("topics", TopicViewSet, basename="topic")

urlpatterns = [
    path("", include(router.urls)),
]
