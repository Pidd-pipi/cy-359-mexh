export type CourseStatus = "open" | "closed" | "started";

export type Difficulty = "family" | "adult" | "pro";

export interface Checkpoint {
  id: number;
  order: number;
  code: string;
  name: string;
}

export interface Course {
  id: number;
  name: string;
  description: string;
  difficulty: Difficulty;
  difficultyLabel: string;
  capacity: number;
  registeredTeams: number;
  remainingSlots: number;
  registerDeadline: string;
  started: boolean;
  status: CourseStatus;
  checkpointCount: number;
  checkpoints?: Checkpoint[];
}

export interface CourseListResponse {
  items: Course[];
}

export interface Team {
  id: number;
  name: string;
  leaderName: string;
  contact: string;
  members: string[];
  createdAt: string;
}

export interface LeaderboardRow {
  teamId: number;
  teamName: string;
  leaderName: string;
  members: string[];
  punchCount: number;
  checkpointCount: number;
  punchedCheckpoints: string[];
  started: boolean;
  finished: boolean;
  totalSeconds: number | null;
  totalTimeLabel: string | null;
  startTime: string | null;
  finishTime: string | null;
  rank: number | null;
}

export interface Leaderboard {
  course: Course;
  totalCheckpoints: number;
  finished: LeaderboardRow[];
  ongoing: LeaderboardRow[];
}

export interface RegisterPayload {
  teamName: string;
  leaderName: string;
  contact?: string;
  /** 个人单独成队时可不传；组队时传全部队员姓名（含队长也可，后端自动补齐） */
  members?: string[];
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.message ?? `请求失败（HTTP ${status}）`);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code ?? "unknown";
  }
}

export interface PunchResult {
  teamId: number;
  checkpoint: Checkpoint;
  punchedAt: string;
}
