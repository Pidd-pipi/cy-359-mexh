export const REQUEST_MESSAGES = {
  healthPath: "/api/health",
  loadCoursesFailed: "线路列表加载失败，请稍后重试。",
  loadLeaderboardFailed: "排名数据加载失败。",
  registerSuccess: "报名成功！",
  punchSuccess: "打卡成功",
  startSuccess: "赛事已开始，可以打卡",
  noCourseSelected: "请先选择一条线路",
};

export const COURSE_STATUS_TEXT: Record<string, string> = {
  open: "报名中",
  closed: "报名已截止",
  started: "赛事进行中",
};

export const DIFFICULTY_COLOR: Record<string, string> = {
  family: "green",
  adult: "blue",
  pro: "red",
};
