class AppError(Exception):
    """业务异常：携带错误码、用户可读消息与 HTTP 状态码。"""

    def __init__(self, code, message, status=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


ERROR_MESSAGES = {
    "overview_unavailable": "Overview data is unavailable",
    "route_not_found": "线路不存在",
    "team_not_found": "队伍不存在",
    "checkpoint_not_found": "打卡点不存在",
    "registration_closed": "报名已截止",
    "route_full": "名额已满",
    "member_conflict": "成员冲突：有成员已报名本线路其他队伍",
    "team_name_taken": "队伍名称已被使用",
    "validation_error": "请求参数不合法",
    "race_not_started": "赛事尚未开始，无法打卡",
}
