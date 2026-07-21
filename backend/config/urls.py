from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts.views import MeView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/users/me/", MeView.as_view(), name="users-me"),
    path("api/v1/", include("apps.catalog.urls")),
    path("api/v1/", include("apps.vocabulary.urls")),
    path("api/v1/", include("apps.grammar.urls")),
    path("api/v1/", include("apps.visual_learning.urls")),
    path("api/v1/", include("apps.exercises.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
