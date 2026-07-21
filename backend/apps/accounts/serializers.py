from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.catalog.models import LevelHsk
from apps.catalog.serializers import LevelHskSerializer
from .models import Role, User


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "name", "description")


class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    current_hsk_level = LevelHskSerializer(read_only=True)
    current_hsk_level_id = serializers.PrimaryKeyRelatedField(
        queryset=LevelHsk.objects.filter(status=True),
        source="current_hsk_level",
        write_only=True,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "avatar_url",
            "role",
            "current_hsk_level",
            "current_hsk_level_id",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("email", "role", "status", "created_at", "updated_at")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = get_user_model()
        fields = ("id", "email", "full_name", "password")

    def validate_email(self, value):
        email = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Email đã được sử dụng.")
        return email

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        request = self.context.get("request")
        user = authenticate(
            request=request,
            username=attrs.get(self.username_field),
            password=attrs.get("password"),
        )
        if user and getattr(user, "status", None) == User.Status.LOCKED:
            raise serializers.ValidationError("Tài khoản đang bị khóa.")

        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user, context=self.context).data
        return data
