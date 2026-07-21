from django.db import models


class LevelHsk(models.Model):
    name = models.CharField(max_length=30, unique=True)
    description = models.TextField(blank=True)
    order_number = models.IntegerField(default=0)
    status = models.BooleanField(default=True)

    class Meta:
        db_table = "level_hsks"
        ordering = ["order_number"]

    def __str__(self):
        return self.name


class Topic(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    thumbnail_url = models.TextField(blank=True)
    order_number = models.IntegerField(default=0)
    status = models.BooleanField(default=True)

    class Meta:
        db_table = "topics"
        ordering = ["order_number", "name"]

    def __str__(self):
        return self.name

