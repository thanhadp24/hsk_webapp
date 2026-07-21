from django.contrib import admin

from .models import (
    AttemptAnswer,
    ExerciseAttempt,
    ExerciseContentType,
    ExerciseMode,
    ExerciseSection,
    ExerciseSectionType,
    ExerciseSet,
    Question,
    QuestionGroup,
    QuestionOption,
    QuestionType,
)


@admin.register(
    ExerciseContentType,
    ExerciseMode,
    ExerciseSectionType,
    QuestionType,
)
class ExerciseLookupAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "order_number", "status")
    list_filter = ("status",)
    search_fields = ("code", "name", "description")
    ordering = ("order_number", "code")


class ExerciseSectionInline(admin.TabularInline):
    model = ExerciseSection
    extra = 0


class QuestionGroupInline(admin.TabularInline):
    model = QuestionGroup
    extra = 0


class QuestionOptionInline(admin.TabularInline):
    model = QuestionOption
    extra = 0


@admin.register(ExerciseSet)
class ExerciseSetAdmin(admin.ModelAdmin):
    list_display = ("title", "level_hsk", "content_type", "exercise_mode", "time_limit_minutes", "status")
    list_filter = ("level_hsk", "content_type", "exercise_mode", "status")
    search_fields = ("title", "description")
    inlines = (ExerciseSectionInline,)


@admin.register(ExerciseSection)
class ExerciseSectionAdmin(admin.ModelAdmin):
    list_display = ("title", "exercise_set", "section_type", "time_limit_minutes", "max_score", "order_number", "status")
    list_filter = ("section_type", "status")
    search_fields = ("title", "instruction")
    inlines = (QuestionGroupInline,)


@admin.register(QuestionGroup)
class QuestionGroupAdmin(admin.ModelAdmin):
    list_display = ("title", "exercise_set", "section", "order_number", "status")
    list_filter = ("status",)
    search_fields = ("title", "instruction", "passage_text")


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "exercise_set", "section", "question_group", "question_type", "score", "order_number", "status")
    list_filter = ("exercise_set", "section", "question_type", "status")
    search_fields = ("question_text", "question_pinyin", "explanation")
    inlines = (QuestionOptionInline,)


@admin.register(QuestionOption)
class QuestionOptionAdmin(admin.ModelAdmin):
    list_display = ("id", "question", "option_text", "is_correct", "order_number")
    list_filter = ("is_correct",)
    search_fields = ("option_text",)


@admin.register(ExerciseAttempt)
class ExerciseAttemptAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "exercise_set", "score", "total_score", "passed", "submitted_at")
    list_filter = ("passed", "exercise_set")
    search_fields = ("user__email", "exercise_set__title")


@admin.register(AttemptAnswer)
class AttemptAnswerAdmin(admin.ModelAdmin):
    list_display = ("id", "attempt", "question", "selected_option", "is_correct", "earned_score")
    list_filter = ("is_correct",)
