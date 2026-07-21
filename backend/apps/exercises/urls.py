from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ExerciseAttemptViewSet, ExerciseSetViewSet

router = DefaultRouter()
router.register("exercise-sets", ExerciseSetViewSet, basename="exercise-set")
router.register("exercise-attempts", ExerciseAttemptViewSet, basename="exercise-attempt")

attempt_history = ExerciseAttemptViewSet.as_view({"get": "list"})

urlpatterns = [
    path("", include(router.urls)),
    path("users/me/exercise-attempts/", attempt_history, name="exercise-attempt-history"),
]
