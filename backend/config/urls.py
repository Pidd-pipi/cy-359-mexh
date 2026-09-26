from django.urls import path

from domain.views import (
    health,
    overview,
    route_detail,
    route_leaderboard,
    route_teams,
    routes_collection,
    team_checkins,
)

# 注意：Nginx 与前端 dev 代理都会把 /api 前缀剥掉再转发，
# 因此每个接口同时注册带前缀与不带前缀两条路由。
ENDPOINTS = [
    ("health", health),
    ("overview", overview),
    ("routes", routes_collection),
    ("routes/<int:route_id>", route_detail),
    ("routes/<int:route_id>/teams", route_teams),
    ("routes/<int:route_id>/leaderboard", route_leaderboard),
    ("teams/<int:team_id>/checkins", team_checkins),
]

urlpatterns = [path(route, view) for route, view in ENDPOINTS]
urlpatterns += [path(f"api/{route}", view) for route, view in ENDPOINTS]
