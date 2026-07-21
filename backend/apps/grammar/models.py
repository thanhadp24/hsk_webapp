from django.db import models


class GrammarPoint(models.Model):
    level_hsk = models.ForeignKey(
        "catalog.LevelHsk", on_delete=models.CASCADE, related_name="grammar_points"
    )
    topic = models.ForeignKey(
        "catalog.Topic",
        on_delete=models.SET_NULL,
        related_name="grammar_points",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    structure = models.TextField()
    meaning_vi = models.TextField()
    explanation = models.TextField()
    note = models.TextField(null=True, blank=True)
    image_url = models.TextField(null=True, blank=True)
    order_number = models.IntegerField(default=0)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "grammar_points"
        ordering = ["order_number", "id"]


class GrammarExample(models.Model):
    grammar_point = models.ForeignKey(
        GrammarPoint, on_delete=models.CASCADE, related_name="examples"
    )
    sentence_chinese = models.TextField()
    pinyin = models.TextField()
    meaning_vi = models.TextField()
    explanation = models.TextField(null=True, blank=True)
    audio_url = models.TextField(null=True, blank=True)
    order_number = models.IntegerField(default=0)

    class Meta:
        db_table = "grammar_examples"
        ordering = ["order_number", "id"]
