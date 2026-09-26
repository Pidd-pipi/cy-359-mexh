export interface FeatureItem {
  id: number;
  title: string;
  description: string;
  status: string;
  metric: string;
}

export interface KpiItem {
  label: string;
  value: string;
  trend: string;
  tone: string;
}

export interface OperationRecord {
  key: string;
  name: string;
  owner: string;
  status: string;
  metric: string;
  priority: string;
}

export interface OverviewResponse {
  appName: string;
  appCode: string;
  description: string;
  features: FeatureItem[];
  kpis: KpiItem[];
  records: OperationRecord[];
}

export interface RaceRoute {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  difficultyLabel: string;
  quota: number;
  registered: number;
  remaining: number;
  checkpointCount: number;
  registrationDeadline: string;
  startTime: string;
  status: string;
}

export interface Checkpoint {
  id: number;
  seq: number;
  name: string;
  clue: string;
}

export interface Team {
  id: number;
  name: string;
  routeId: number;
  members: string[];
  createdAt: string;
}

export interface RouteDetail extends RaceRoute {
  checkpoints: Checkpoint[];
  teams: Team[];
}

export interface LeaderboardEntry {
  teamId: number;
  teamName: string;
  members: string[];
  totalSeconds: number;
  finishedAt: string;
  rank: number;
}

export interface InProgressEntry {
  teamId: number;
  teamName: string;
  members: string[];
  doneCheckpoints: number;
  totalCheckpoints: number;
  lastCheckinAt: string | null;
}

export interface LeaderboardResponse {
  route: RaceRoute;
  started: boolean;
  totalCheckpoints: number;
  finished: LeaderboardEntry[];
  inProgress: InProgressEntry[];
}

export interface CheckinRecord {
  id: number;
  teamId: number;
  checkpointId: number;
  checkedAt: string;
  created: boolean;
}

export interface TeamCheckin {
  id: number;
  checkpointId: number;
  checkpointName: string;
  checkpointSeq: number;
  checkedAt: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
}
