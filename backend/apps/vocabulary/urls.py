from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SavedVocabularyViewSet, VocabularyViewSet

router = DefaultRouter()
router.register("vocabularies", VocabularyViewSet, basename="vocabulary")

saved_list = SavedVocabularyViewSet.as_view({"get": "list"})

urlpatterns = [
    path("", include(router.urls)),
    path("users/me/saved-vocabularies/", saved_list, name="saved-vocabularies"),
]
