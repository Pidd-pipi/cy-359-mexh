import { API_BASE_URL } from "../constants/app";
import type {
  CheckinRecord,
  LeaderboardResponse,
  OverviewResponse,
  RaceRoute,
  RouteDetail,
  Team,
  TeamCheckin,
} from "../types";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    let code = "request_failed";
    let message = `请求失败（${response.status}）`;
    try {
      const payload = await response.json();
      if (payload?.error) {
        code = payload.error.code ?? code;
        message = payload.error.message ?? message;
      }
    } catch {
      // 保留默认错误信息
    }
    throw new ApiError(code, message, response.status);
  }

  return response.json() as Promise<T>;
}

export function fetchOverview(): Promise<OverviewResponse> {
  return request<OverviewResponse>("/overview");
}

export function fetchRoutes(): Promise<RaceRoute[]> {
  return request<{ routes: RaceRoute[] }>("/routes").then((data) => data.routes);
}

export function fetchRouteDetail(routeId: number): Promise<RouteDetail> {
  return request<RouteDetail>(`/routes/${routeId}`);
}

export function fetchRouteTeams(routeId: number): Promise<Team[]> {
  return request<{ teams: Team[] }>(`/routes/${routeId}/teams`).then((data) => data.teams);
}

export function registerTeam(
  routeId: number,
  payload: { name: string; members: string[] },
): Promise<Team> {
  return request<Team>(`/routes/${routeId}/teams`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchLeaderboard(routeId: number): Promise<LeaderboardResponse> {
  return request<LeaderboardResponse>(`/routes/${routeId}/leaderboard`);
}

export function createCheckin(teamId: number, checkpointId: number): Promise<CheckinRecord> {
  return request<CheckinRecord>(`/teams/${teamId}/checkins`, {
    method: "POST",
    body: JSON.stringify({ checkpointId }),
  });
}

export function fetchTeamCheckins(teamId: number): Promise<TeamCheckin[]> {
  return request<{ checkins: TeamCheckin[] }>(`/teams/${teamId}/checkins`).then(
    (data) => data.checkins,
  );
}
