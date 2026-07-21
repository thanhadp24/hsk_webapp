from django.db import models


class VisualLearningImage(models.Model):
    level_hsk = models.ForeignKey(
        "catalog.LevelHsk", on_delete=models.CASCADE, related_name="visual_learning_images"
    )
    image_url = models.TextField()
    order_number = models.IntegerField(default=0)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "visual_learning_images"
        ordering = ["order_number", "id"]
