class AppError(Exception):
    """业务异常：携带稳定的错误码与中文提示，供视图层映射为 HTTP 响应。"""

    status_code = 400

    def __init__(self, code: str, message: str, status_code: int | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        if status_code is not None:
            self.status_code = status_code


ERROR_MESSAGES = {
    "overview_unavailable": "Overview data is unavailable",
    "course_not_found": "线路不存在",
    "team_not_found": "队伍不存在",
    "checkpoint_not_found": "检查点不存在",
    "registration_closed": "报名已截止",
    "race_started": "赛事已开始，无法再报名",
    "capacity_full": "名额已满",
    "team_name_conflict": "该线路下队伍名称已被占用",
    "member_conflict": "成员 %s 已报名本线路，同一人只能属于一支队伍",
    "invalid_members": "队伍成员信息不合法",
    "duplicate_punch": "该检查点已打卡，请勿重复打卡",
    "race_not_started": "赛事尚未开始，暂时无法打卡",
}
