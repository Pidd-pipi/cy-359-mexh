import { API_BASE_URL } from "../constants/app";
import { ApiError } from "../types";
import type {
  Course,
  CourseListResponse,
  Leaderboard,
  PunchResult,
  RegisterPayload,
  Team,
} from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    ...init,
  });

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body as { code: string; message: string } | null
    );
  }
  return body as T;
}

export async function fetchCourses(): Promise<Course[]> {
  const data = await request<CourseListResponse>("/courses");
  return data.items;
}

export function fetchCourse(courseId: number): Promise<Course> {
  return request<Course>(`/courses/${courseId}`);
}

export function fetchLeaderboard(courseId: number): Promise<Leaderboard> {
  return request<Leaderboard>(`/courses/${courseId}/leaderboard`);
}

export function registerTeam(
  courseId: number,
  payload: RegisterPayload
): Promise<Team> {
  return request<Team>(`/courses/${courseId}/register`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function startRace(courseId: number): Promise<Course> {
  return request<Course>(`/courses/${courseId}/start`, { method: "POST" });
}

export function punch(
  teamId: number,
  checkpointCode: string
): Promise<PunchResult> {
  return request<PunchResult>(`/teams/${teamId}/punch`, {
    method: "POST",
    body: JSON.stringify({ checkpointCode }),
  });
}
