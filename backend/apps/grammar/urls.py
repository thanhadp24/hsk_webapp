from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import GrammarPointViewSet

router = DefaultRouter()
router.register("grammar-points", GrammarPointViewSet, basename="grammar-point")

urlpatterns = [
    path("", include(router.urls)),
]
