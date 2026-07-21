from django.utils import timezone
from rest_framework import serializers

from apps.catalog.serializers import (
    LevelHskSerializer,
    TopicSerializer,
)

from .models import (
    AttemptAnswer,
    ExerciseAttempt,
    ExerciseSection,
    ExerciseSet,
    QuestionGroup,
    Question,
    QuestionOption,
)


class LookupCodeField(serializers.RelatedField):
    def to_representation(self, value):
        return value.code if value else None


class QuestionGroupPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionGroup
        fields = (
            "id",
            "section_id",
            "title",
            "instruction",
            "passage_text",
            "passage_pinyin",
            "audio_url",
            "image_url",
            "start_time_seconds",
            "end_time_seconds",
            "order_number",
        )


class QuestionOptionPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ("id", "option_text", "image_url", "audio_url", "order_number")


class QuestionPublicSerializer(serializers.ModelSerializer):
    options = QuestionOptionPublicSerializer(many=True, read_only=True)
    question_type = LookupCodeField(read_only=True)

    class Meta:
        model = Question
        fields = (
            "id",
            "section_id",
            "question_group_id",
            "question_type",
            "question_text",
            "question_pinyin",
            "image_url",
            "audio_url",
            "score",
            "start_time_seconds",
            "end_time_seconds",
            "order_number",
            "options",
        )


class ExerciseSectionPublicSerializer(serializers.ModelSerializer):
    section_type = LookupCodeField(read_only=True)
    question_groups = QuestionGroupPublicSerializer(many=True, read_only=True)

    class Meta:
        model = ExerciseSection
        fields = (
            "id",
            "section_type",
            "title",
            "instruction",
            "audio_url",
            "time_limit_minutes",
            "max_score",
            "order_number",
            "question_groups",
        )


class ExerciseSetSerializer(serializers.ModelSerializer):
    level_hsk = LevelHskSerializer(read_only=True)
    topic = TopicSerializer(read_only=True)
    question_count = serializers.IntegerField(read_only=True)
    content_type = LookupCodeField(read_only=True)
    exercise_mode = LookupCodeField(read_only=True)

    class Meta:
        model = ExerciseSet
        fields = (
            "id",
            "level_hsk",
            "topic",
            "title",
            "description",
            "content_type",
            "exercise_mode",
            "time_limit_minutes",
            "passing_score",
            "order_number",
            "question_count",
        )


class ExerciseSetDetailSerializer(ExerciseSetSerializer):
    questions = serializers.SerializerMethodField()
    sections = ExerciseSectionPublicSerializer(many=True, read_only=True)
    question_groups = QuestionGroupPublicSerializer(many=True, read_only=True)

    class Meta(ExerciseSetSerializer.Meta):
        fields = ExerciseSetSerializer.Meta.fields + ("sections", "question_groups", "questions")

    def get_questions(self, obj):
        questions = (
            obj.questions.filter(status=True)
            .select_related("section", "question_group", "question_type")
            .prefetch_related("options")
        )
        return QuestionPublicSerializer(questions, many=True).data


class SubmitAnswerSerializer(serializers.Serializer):
    questionId = serializers.IntegerField()
    selectedOptionId = serializers.IntegerField(required=False, allow_null=True)
    answerText = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    answerPayload = serializers.JSONField(required=False, allow_null=True)


class SubmitExerciseSerializer(serializers.Serializer):
    startedAt = serializers.DateTimeField(required=False, allow_null=True)
    answers = SubmitAnswerSerializer(many=True)


class SubmitExerciseResultSerializer(serializers.Serializer):
    attemptId = serializers.IntegerField()
    score = serializers.DecimalField(max_digits=6, decimal_places=2)
    totalScore = serializers.DecimalField(max_digits=6, decimal_places=2)
    correctCount = serializers.IntegerField()
    wrongCount = serializers.IntegerField()
    passed = serializers.BooleanField()
    submittedAt = serializers.DateTimeField()


class ExerciseAttemptListSerializer(serializers.ModelSerializer):
    exercise_set = ExerciseSetSerializer(read_only=True)

    class Meta:
        model = ExerciseAttempt
        fields = (
            "id",
            "exercise_set",
            "score",
            "total_score",
            "correct_count",
            "wrong_count",
            "passed",
            "started_at",
            "submitted_at",
            "duration_seconds",
        )


class AttemptOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ("id", "option_text", "image_url", "audio_url")


class AttemptAnswerSerializer(serializers.ModelSerializer):
    question_id = serializers.IntegerField(source="question.id", read_only=True)
    question_text = serializers.CharField(source="question.question_text", read_only=True)
    selected_option = AttemptOptionSerializer(read_only=True)
    correct_option = serializers.SerializerMethodField()
    explanation = serializers.CharField(source="question.explanation", read_only=True)

    class Meta:
        model = AttemptAnswer
        fields = (
            "question_id",
            "question_text",
            "selected_option",
            "answer_text",
            "answer_payload",
            "correct_option",
            "is_correct",
            "earned_score",
            "explanation",
        )

    def get_correct_option(self, obj):
        option = obj.question.options.filter(is_correct=True).first()
        return AttemptOptionSerializer(option).data if option else None


class ExerciseAttemptDetailSerializer(ExerciseAttemptListSerializer):
    answers = AttemptAnswerSerializer(many=True, read_only=True)

    class Meta(ExerciseAttemptListSerializer.Meta):
        fields = ExerciseAttemptListSerializer.Meta.fields + ("answers",)


def calculate_duration_seconds(started_at):
    if not started_at:
        return None
    now = timezone.now()
    if started_at > now:
        return 0
    return int((now - started_at).total_seconds())
