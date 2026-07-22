from django.conf import settings
from django.db import models


class Vocabulary(models.Model):
    level_hsk = models.ForeignKey(
        "catalog.LevelHsk", on_delete=models.CASCADE, related_name="vocabularies"
    )
    topic = models.ForeignKey(
        "catalog.Topic",
        on_delete=models.SET_NULL,
        related_name="vocabularies",
        null=True,
        blank=True,
    )
    simplified = models.CharField(max_length=100)
    traditional = models.CharField(max_length=100, null=True, blank=True)
    pinyin = models.CharField(max_length=255)
    meaning_vi = models.TextField()
    word_type = models.CharField(max_length=50)
    audio_url = models.TextField(null=True, blank=True)
    image_url = models.TextField(null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    order_number = models.IntegerField(default=0)
    han_viet = models.CharField(max_length=100, null=True, blank=True)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vocabularies"
        ordering = ["order_number", "id"]
        indexes = [
            models.Index(
                fields=["status", "level_hsk", "topic", "order_number", "id"],
                name="vocab_st_lv_tp_ord_idx",
            ),
            models.Index(
                fields=["status", "level_hsk", "order_number", "id"],
                name="vocab_st_lv_ord_idx",
            ),
            models.Index(
                fields=["status", "word_type", "order_number", "id"],
                name="vocab_st_type_ord_idx",
            ),
        ]


class VocabularyExample(models.Model):
    vocabulary = models.ForeignKey(
        Vocabulary, on_delete=models.CASCADE, related_name="examples"
    )
    sentence_chinese = models.TextField()
    pinyin = models.TextField()
    meaning_vi = models.TextField()
    audio_url = models.TextField(null=True, blank=True)
    order_number = models.IntegerField(default=0)

    class Meta:
        db_table = "vocabulary_examples"
        ordering = ["order_number", "id"]
        indexes = [
            models.Index(
                fields=["vocabulary", "order_number", "id"],
                name="vocab_ex_vocab_ord_idx",
            ),
        ]


class UserSavedVocabulary(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_vocabularies"
    )
    vocabulary = models.ForeignKey(
        Vocabulary, on_delete=models.CASCADE, related_name="saved_by_users"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_saved_vocabularies"
        indexes = [
            models.Index(
                fields=["user", "created_at"],
                name="saved_vocab_user_cr_idx",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "vocabulary"], name="unique_saved_vocabulary"
            )
        ]
