export const REQUEST_MESSAGES = {
  overviewFallback: "已加载本地运营样例，后端联通后会自动展示实时数据。",
  healthPath: "/api/health",
  routesFallback: "线路数据加载失败，请稍后重试。",
  registerSuccess: "报名成功，已锁定名额。",
  checkinSuccess: "打卡成功。",
  checkinDuplicate: "该打卡点已记录，无需重复打卡。",
};

export const ERROR_MESSAGES: Record<string, string> = {
  route_full: "名额已满",
  member_conflict: "成员冲突",
  registration_closed: "报名已截止",
  race_not_started: "赛事尚未开始，无法打卡",
};
