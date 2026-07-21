from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .models import AttemptAnswer, ExerciseAttempt, ExerciseSet, Question, QuestionOption
from .serializers import (
    ExerciseAttemptDetailSerializer,
    ExerciseAttemptListSerializer,
    ExerciseSetDetailSerializer,
    ExerciseSetSerializer,
    SubmitExerciseSerializer,
    calculate_duration_seconds,
)


class ExerciseSetViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    ordering_fields = ("order_number", "title", "created_at")
    search_fields = ("title", "description")
    ordering = ("order_number", "id")

    def get_queryset(self):
        queryset = (
            ExerciseSet.objects.filter(status=True)
            .select_related("level_hsk", "topic", "content_type", "exercise_mode")
            .annotate(question_count=Count("questions", filter=Q(questions__status=True)))
            .prefetch_related(
                "sections__section_type",
                "sections__question_groups",
                "question_groups",
                "questions__question_type",
                "questions__options",
            )
        )
        params = self.request.query_params
        filters = {
            "level_hsk_id": params.get("level_hsk_id"),
            "topic_id": params.get("topic_id"),
            "content_type__code": params.get("content_type"),
            "exercise_mode__code": params.get("exercise_mode"),
        }
        for field, value in filters.items():
            if value:
                queryset = queryset.filter(**{field: value})
        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ExerciseSetDetailSerializer
        return ExerciseSetSerializer

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def submit(self, request, pk=None):
        exercise_set = self.get_object()
        serializer = SubmitExerciseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answers = serializer.validated_data["answers"]
        submitted_at = timezone.now()
        started_at = serializer.validated_data.get("startedAt")

        with transaction.atomic():
            question_ids = [answer["questionId"] for answer in answers]
            questions = {
                question.id: question
                for question in Question.objects.select_for_update().filter(
                    exercise_set=exercise_set, status=True, id__in=question_ids
                )
            }
            if len(questions) != len(set(question_ids)):
                raise ValidationError("Có câu hỏi không thuộc bộ bài tập này.")

            option_ids = [
                answer["selectedOptionId"]
                for answer in answers
                if answer.get("selectedOptionId") is not None
            ]
            options = {
                option.id: option
                for option in QuestionOption.objects.select_related("question").filter(
                    id__in=option_ids, question_id__in=questions.keys()
                )
            }
            if len(options) != len(set(option_ids)):
                raise ValidationError("Có lựa chọn không thuộc câu hỏi đã gửi.")

            total_score = sum(question.score for question in questions.values())
            score = 0
            correct_count = 0
            attempt_answers = []

            for answer in answers:
                question = questions[answer["questionId"]]
                selected_option_id = answer.get("selectedOptionId")
                option = options.get(selected_option_id) if selected_option_id is not None else None
                if option and option.question_id != question.id:
                    raise ValidationError("Lựa chọn không thuộc câu hỏi tương ứng.")

                answer_text = answer.get("answerText")
                answer_payload = answer.get("answerPayload")
                is_correct = False
                if option:
                    is_correct = option.is_correct
                elif question.correct_answer_text and answer_text:
                    is_correct = answer_text.strip() == question.correct_answer_text.strip()
                earned_score = question.score if is_correct else 0
                score += earned_score
                correct_count += 1 if is_correct else 0
                attempt_answers.append(
                    AttemptAnswer(
                        question=question,
                        selected_option=option,
                        answer_text=answer_text,
                        answer_payload=answer_payload,
                        is_correct=is_correct,
                        earned_score=earned_score,
                    )
                )

            wrong_count = len(answers) - correct_count
            passed = total_score > 0 and (score / total_score * 100) >= exercise_set.passing_score
            attempt = ExerciseAttempt.objects.create(
                user=request.user,
                exercise_set=exercise_set,
                score=score,
                total_score=total_score,
                correct_count=correct_count,
                wrong_count=wrong_count,
                passed=passed,
                started_at=started_at,
                submitted_at=submitted_at,
                duration_seconds=calculate_duration_seconds(started_at),
            )
            for attempt_answer in attempt_answers:
                attempt_answer.attempt = attempt
            AttemptAnswer.objects.bulk_create(attempt_answers)

        return Response(
            {
                "attemptId": attempt.id,
                "score": attempt.score,
                "totalScore": attempt.total_score,
                "correctCount": attempt.correct_count,
                "wrongCount": attempt.wrong_count,
                "passed": attempt.passed,
                "submittedAt": attempt.submitted_at,
            },
            status=status.HTTP_201_CREATED,
        )


class ExerciseAttemptViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    permission_classes = [IsAuthenticated]
    ordering = ("-submitted_at",)

    def get_queryset(self):
        queryset = (
            ExerciseAttempt.objects.select_related(
                "exercise_set",
                "exercise_set__level_hsk",
                "exercise_set__topic",
                "exercise_set__content_type",
                "exercise_set__exercise_mode",
            )
            .prefetch_related(
                "answers",
                "answers__question",
                "answers__question__options",
                "answers__selected_option",
            )
            .filter(user=self.request.user)
        )
        if self.request.user.is_staff and self.request.query_params.get("all") == "1":
            return queryset.model.objects.all()
        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ExerciseAttemptDetailSerializer
        return ExerciseAttemptListSerializer

    def retrieve(self, request, *args, **kwargs):
        attempt = self.get_object()
        if attempt.user_id != request.user.id and not request.user.is_staff:
            raise PermissionDenied("Bạn không có quyền xem bài nộp này.")
        return Response(self.get_serializer(attempt).data)
