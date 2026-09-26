import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .errors import AppError
from . import services


def health(_request):
    return JsonResponse({"status": "ok"})


def overview(_request):
    return JsonResponse(services.get_overview())


def _error_response(error):
    return JsonResponse(
        {"error": {"code": error.code, "message": error.message}},
        status=error.status,
    )


def _parse_json(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise AppError("validation_error", "请求体不是合法的 JSON")


def _api(view_func):
    """统一异常处理：业务错误返回 {error:{code,message}}。"""

    @csrf_exempt
    def wrapper(request, *args, **kwargs):
        try:
            return view_func(request, *args, **kwargs)
        except AppError as error:
            return _error_response(error)

    return wrapper


@_api
@require_http_methods(["GET"])
def routes_collection(_request):
    return JsonResponse({"routes": services.list_routes()})


@_api
@require_http_methods(["GET"])
def route_detail(_request, route_id):
    return JsonResponse(services.get_route_detail(route_id))


@_api
@require_http_methods(["GET", "POST"])
def route_teams(request, route_id):
    if request.method == "GET":
        return JsonResponse({"teams": services.list_route_teams(route_id)})
    payload = _parse_json(request)
    team = services.register_team(
        route_id,
        payload.get("name"),
        payload.get("members"),
    )
    return JsonResponse(team, status=201)


@_api
@require_http_methods(["GET"])
def route_leaderboard(_request, route_id):
    return JsonResponse(services.get_leaderboard(route_id))


@_api
@require_http_methods(["GET", "POST"])
def team_checkins(request, team_id):
    if request.method == "GET":
        return JsonResponse({"checkins": services.list_team_checkins(team_id)})
    payload = _parse_json(request)
    checkpoint_id = payload.get("checkpointId")
    if checkpoint_id is None:
        raise AppError("validation_error", "缺少 checkpointId")
    checkin = services.record_checkin(team_id, checkpoint_id)
    return JsonResponse(checkin, status=201 if checkin["created"] else 200)
