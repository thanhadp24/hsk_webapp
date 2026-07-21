from django.conf import settings
from django.db import models


class ExerciseLookupModel(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    order_number = models.IntegerField(default=0)
    status = models.BooleanField(default=True)

    class Meta:
        abstract = True
        ordering = ["order_number", "code"]

    def __str__(self):
        return self.name


class ExerciseContentType(ExerciseLookupModel):
    class Meta(ExerciseLookupModel.Meta):
        db_table = "exercise_content_types"


class ExerciseMode(ExerciseLookupModel):
    class Meta(ExerciseLookupModel.Meta):
        db_table = "exercise_modes"


class ExerciseSectionType(ExerciseLookupModel):
    class Meta(ExerciseLookupModel.Meta):
        db_table = "exercise_section_types"


class QuestionType(ExerciseLookupModel):
    class Meta(ExerciseLookupModel.Meta):
        db_table = "question_types"


class ExerciseSet(models.Model):
    level_hsk = models.ForeignKey(
        "catalog.LevelHsk", on_delete=models.CASCADE, related_name="exercise_sets"
    )
    topic = models.ForeignKey(
        "catalog.Topic",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="exercise_sets",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    content_type = models.ForeignKey(
        ExerciseContentType,
        on_delete=models.PROTECT,
        related_name="exercise_sets",
        null=True,
        blank=True,
    )
    exercise_mode = models.ForeignKey(
        ExerciseMode,
        on_delete=models.PROTECT,
        related_name="exercise_sets",
        null=True,
        blank=True,
    )
    time_limit_minutes = models.IntegerField(null=True, blank=True)
    passing_score = models.DecimalField(max_digits=5, decimal_places=2)
    order_number = models.IntegerField(default=0)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "exercise_sets"
        ordering = ["order_number", "id"]


class ExerciseSection(models.Model):
    exercise_set = models.ForeignKey(
        ExerciseSet, on_delete=models.CASCADE, related_name="sections"
    )
    section_type = models.ForeignKey(
        ExerciseSectionType,
        on_delete=models.PROTECT,
        related_name="sections",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    instruction = models.TextField(null=True, blank=True)
    audio_url = models.TextField(null=True, blank=True)
    time_limit_minutes = models.IntegerField(null=True, blank=True)
    max_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    order_number = models.IntegerField(default=0)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "exercise_sections"
        ordering = ["order_number", "id"]
        unique_together = (("exercise_set", "order_number"),)

    def __str__(self):
        return self.title


class QuestionGroup(models.Model):
    exercise_set = models.ForeignKey(
        ExerciseSet, on_delete=models.CASCADE, related_name="question_groups"
    )
    section = models.ForeignKey(
        ExerciseSection,
        on_delete=models.CASCADE,
        related_name="question_groups",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255, null=True, blank=True)
    instruction = models.TextField(null=True, blank=True)
    passage_text = models.TextField(null=True, blank=True)
    passage_pinyin = models.TextField(null=True, blank=True)
    audio_url = models.TextField(null=True, blank=True)
    image_url = models.TextField(null=True, blank=True)
    start_time_seconds = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    end_time_seconds = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    order_number = models.IntegerField(default=0)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "question_groups"
        ordering = ["order_number", "id"]
        unique_together = (("exercise_set", "order_number"),)

    def __str__(self):
        return self.title or f"Group {self.order_number}"


class Question(models.Model):
    exercise_set = models.ForeignKey(
        ExerciseSet, on_delete=models.CASCADE, related_name="questions"
    )
    section = models.ForeignKey(
        ExerciseSection,
        on_delete=models.SET_NULL,
        related_name="questions",
        null=True,
        blank=True,
    )
    question_group = models.ForeignKey(
        QuestionGroup,
        on_delete=models.SET_NULL,
        related_name="questions",
        null=True,
        blank=True,
    )
    question_type = models.ForeignKey(
        QuestionType,
        on_delete=models.PROTECT,
        related_name="questions",
        null=True,
        blank=True,
    )
    question_text = models.TextField()
    question_pinyin = models.TextField(null=True, blank=True)
    image_url = models.TextField(null=True, blank=True)
    audio_url = models.TextField(null=True, blank=True)
    explanation = models.TextField(null=True, blank=True)
    correct_answer_text = models.TextField(null=True, blank=True)
    start_time_seconds = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    end_time_seconds = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    score = models.DecimalField(max_digits=6, decimal_places=2)
    order_number = models.IntegerField(default=0)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "questions"
        unique_together = (("exercise_set", "order_number"),)
        ordering = ["order_number", "id"]


class QuestionOption(models.Model):
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="options"
    )
    option_text = models.TextField(null=True, blank=True)
    image_url = models.TextField(null=True, blank=True)
    audio_url = models.TextField(null=True, blank=True)
    is_correct = models.BooleanField(default=False)
    order_number = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "question_options"
        unique_together = (("question", "order_number"),)
        ordering = ["order_number", "id"]


class ExerciseAttempt(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="exercise_attempts",
    )
    exercise_set = models.ForeignKey(
        ExerciseSet, on_delete=models.CASCADE, related_name="attempts"
    )
    score = models.DecimalField(max_digits=6, decimal_places=2)
    total_score = models.DecimalField(max_digits=6, decimal_places=2)
    correct_count = models.IntegerField(default=0)
    wrong_count = models.IntegerField(default=0)
    passed = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField()
    duration_seconds = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "exercise_attempts"
        ordering = ["-submitted_at"]


class AttemptAnswer(models.Model):
    attempt = models.ForeignKey(
        ExerciseAttempt, on_delete=models.CASCADE, related_name="answers"
    )
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.ForeignKey(QuestionOption, on_delete=models.CASCADE, null=True, blank=True)
    answer_text = models.TextField(null=True, blank=True)
    answer_payload = models.JSONField(null=True, blank=True)
    is_correct = models.BooleanField(default=False)
    earned_score = models.DecimalField(max_digits=6, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attempt_answers"
        unique_together = (("attempt", "question"),)
