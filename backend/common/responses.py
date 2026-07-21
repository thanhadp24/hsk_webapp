from rest_framework.response import Response


def success_response(data=None, message: str = "OK", status: int = 200) -> Response:
    return Response({"message": message, "data": data}, status=status)
