from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import VisualLearningImageViewSet

router = DefaultRouter()
router.register(
    "visual-learning-images", VisualLearningImageViewSet, basename="visual-learning-image"
)

urlpatterns = [
    path("", include(router.urls)),
]
