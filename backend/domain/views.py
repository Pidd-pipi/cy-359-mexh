import json

from django.http import JsonResponse
from django.db import IntegrityError
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .errors import AppError
from . import services


def health(_request):
    return JsonResponse({"status": "ok"})


def overview(_request):
    payload = services.get_overview()
    payload["courses"] = services.list_courses()
    return JsonResponse(payload)


@require_http_methods(["GET"])
def course_list(_request):
    return JsonResponse({"items": services.list_courses()})


@require_http_methods(["GET"])
def course_detail(_request, course_id):
    try:
        return JsonResponse(services.get_course_detail(course_id))
    except AppError as exc:
        return _error_response(exc)


@require_http_methods(["GET"])
def leaderboard(_request, course_id):
    try:
        return JsonResponse(services.get_leaderboard(course_id))
    except AppError as exc:
        return _error_response(exc)


@csrf_exempt
@require_http_methods(["POST"])
def register(request, course_id):
    try:
        payload = _parse_json(request)
        team = services.register_team(course_id, payload)
    except AppError as exc:
        return _error_response(exc)
    except IntegrityError:
        # 并发下唯一约束兜底：名额或成员被其他事务抢先占用
        return JsonResponse(
            {"code": "conflict", "message": "报名冲突：名额已满或成员已在其他队伍中"},
            status=409,
        )
    return JsonResponse(team, status=201)


@csrf_exempt
@require_http_methods(["POST"])
def start(request, course_id):
    try:
        return JsonResponse(services.start_race(course_id))
    except AppError as exc:
        return _error_response(exc)


@csrf_exempt
@require_http_methods(["POST"])
def punch(request, team_id):
    try:
        payload = _parse_json(request)
        checkpoint_code = payload.get("checkpointCode", "")
        result = services.punch(team_id, checkpoint_code)
    except AppError as exc:
        return _error_response(exc)
    except IntegrityError:
        return JsonResponse(
            {"code": "duplicate_punch", "message": "该检查点已打卡，请勿重复打卡"},
            status=409,
        )
    return JsonResponse(result, status=201)


def _parse_json(request):
    if not request.body:
        return {}
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise AppError("invalid_json", "请求体不是合法的 JSON", 400)
    if not isinstance(payload, dict):
        raise AppError("invalid_payload", "请求体必须是 JSON 对象", 400)
    return payload


def _error_response(exc):
    return JsonResponse(
        {"code": exc.code, "message": exc.message}, status=exc.status_code
    )
