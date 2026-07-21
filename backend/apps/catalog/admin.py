from django.contrib import admin

from .models import LevelHsk, Topic


@admin.register(LevelHsk)
class LevelHskAdmin(admin.ModelAdmin):
    list_display = ("name", "order_number", "status")
    list_filter = ("status",)
    search_fields = ("name", "description")
    ordering = ("order_number", "name")


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ("name", "order_number", "status")
    list_filter = ("status",)
    search_fields = ("name", "slug", "description")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("order_number", "name")
