from django.urls import path
from domain import views

# Nginx 把 /api/ 转发到后端根路径（去掉 /api 前缀）；
# 同时保留 /api 前缀的路由，兼容后端直连访问。
routes = [
    ("health", views.health),
    ("overview", views.overview),
    ("courses", views.course_list),
    ("courses/<int:course_id>", views.course_detail),
    ("courses/<int:course_id>/leaderboard", views.leaderboard),
    ("courses/<int:course_id>/register", views.register),
    ("courses/<int:course_id>/start", views.start),
    ("teams/<int:team_id>/punch", views.punch),
]

urlpatterns = [path(pattern, view) for pattern, view in routes]
urlpatterns += [path(f"api/{pattern}", view) for pattern, view in routes]
