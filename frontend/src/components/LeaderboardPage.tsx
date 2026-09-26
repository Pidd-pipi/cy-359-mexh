import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Progress,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { fetchCourses, fetchLeaderboard, punch } from "../api/client";
import { REQUEST_MESSAGES } from "../constants/messages";
import type { Course, Leaderboard, LeaderboardRow } from "../types";

interface LeaderboardPageProps {
  selectedCourseId: number | null;
  onSelectCourse: (courseId: number) => void;
}

const RANK_MEDALS: Record<number, string> = { 1: "#f5a623", 2: "#8c8c8c", 3: "#b07a55" };

export function LeaderboardPage({
  selectedCourseId,
  onSelectCourse,
}: LeaderboardPageProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamIdInput, setTeamIdInput] = useState("");
  const [punchingCode, setPunchingCode] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .catch(() => message.error(REQUEST_MESSAGES.loadCoursesFailed));
  }, []);

  const courseId = selectedCourseId ?? courses[0]?.id ?? null;

  useEffect(() => {
    if (courseId === null) return;
    onSelectCourse(courseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, courses.length]);

  const load = useCallback(async () => {
    if (courseId === null) return;
    try {
      setBoard(await fetchLeaderboard(courseId));
    } catch {
      message.error(REQUEST_MESSAGES.loadLeaderboardFailed);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId === null) return;
    setLoading(true);
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(timer);
  }, [courseId, load]);

  const myTeam: LeaderboardRow | null = useMemo(() => {
    if (!board || !teamIdInput) return null;
    const id = Number(teamIdInput);
    return (
      board.finished.find((row) => row.teamId === id) ??
      board.ongoing.find((row) => row.teamId === id) ??
      null
    );
  }, [board, teamIdInput]);

  const handlePunch = async (code: string) => {
    const teamId = Number(teamIdInput);
    if (!Number.isInteger(teamId) || teamId <= 0) {
      message.warning("请先输入有效的队伍编号");
      return;
    }
    setPunchingCode(code);
    try {
      const result = await punch(teamId, code);
      message.success(
        `${REQUEST_MESSAGES.punchSuccess}：CP${result.checkpoint.order} ${result.checkpoint.name}`
      );
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "打卡失败");
    } finally {
      setPunchingCode(null);
    }
  };

  const finishedColumns: ColumnsType<LeaderboardRow> = [
    {
      title: "名次",
      dataIndex: "rank",
      width: 90,
      render: (rank: number) => (
        <span
          className="rank-badge"
          style={{
            background: RANK_MEDALS[rank] ?? "rgba(39,29,26,.12)",
            color: rank <= 3 ? "#fff" : undefined,
          }}
        >
          {rank}
        </span>
      ),
    },
    { title: "队伍", dataIndex: "teamName", render: (v) => <strong>{v}</strong> },
    { title: "队长", dataIndex: "leaderName", width: 110 },
    {
      title: "成员",
      dataIndex: "members",
      render: (members: string[]) => (
        <Space size={4} wrap>
          {members.map((name) => (
            <Tag key={name}>{name}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "打卡",
      dataIndex: "punchCount",
      width: 90,
      align: "center",
      render: (count: number, row) => `${count}/${row.checkpointCount}`,
    },
    {
      title: "总用时",
      dataIndex: "totalTimeLabel",
      width: 130,
      sorter: (a, b) => (a.totalSeconds ?? 0) - (b.totalSeconds ?? 0),
      defaultSortOrder: "ascend",
      render: (label: string) => <Typography.Text strong>{label}</Typography.Text>,
    },
    {
      title: "完成时间",
      dataIndex: "finishTime",
      width: 180,
      render: (v: string | null) => (v ? v.replace("T", " ").slice(0, 19) : "-"),
    },
  ];

  const ongoingColumns: ColumnsType<LeaderboardRow> = [
    {
      title: "队伍",
      dataIndex: "teamName",
      render: (v, row) => (
        <Space>
          <strong>{v}</strong>
          <Tag icon={<ClockCircleOutlined />} color="orange">
            进行中
          </Tag>
          <span className="muted">队长 {row.leaderName}</span>
        </Space>
      ),
    },
    {
      title: "成员",
      dataIndex: "members",
      render: (members: string[]) => (
        <Space size={4} wrap>
          {members.map((name) => (
            <Tag key={name}>{name}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "打卡进度",
      width: 280,
      render: (_v, row) => (
        <div className="progress-cell">
          <Progress
            percent={Math.round((row.punchCount / row.checkpointCount) * 100)}
            size="small"
            format={() => `${row.punchCount}/${row.checkpointCount}`}
          />
          <Space size={4} wrap>
            {row.punchedCheckpoints.map((code) => (
              <Tag key={code} color="blue">
                {code}
              </Tag>
            ))}
          </Space>
        </div>
      ),
    },
  ];

  const checkpoints = board?.course.checkpoints ?? [];
  const punchedSet = new Set(myTeam?.punchedCheckpoints ?? []);

  return (
    <div className="leaderboard-page">
      <div className="page-toolbar">
        <Typography.Title level={3} style={{ margin: 0 }}>
          实时排名
        </Typography.Title>
        <Space>
          {courses.length > 0 && (
            <Segmented
              value={courseId ?? undefined}
              onChange={(value) => {
                onSelectCourse(Number(value));
                setTeamIdInput("");
              }}
              options={courses.map((course) => ({
                label: course.name,
                value: course.id,
              }))}
            />
          )}
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
            刷新
          </Button>
        </Space>
      </div>

      {courseId === null && !loading ? (
        <Empty description="暂无可查看的线路" />
      ) : (
        <>
          <Row gutter={16} className="stat-row">
            <Col xs={12} md={6}>
              <Card>
                <Statistic
                  title="报名队伍"
                  value={(board?.finished.length ?? 0) + (board?.ongoing.length ?? 0)}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic title="已完赛" value={board?.finished.length ?? 0} prefix={<CheckCircleFilled />} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic title="进行中/缺卡" value={board?.ongoing.length ?? 0} prefix={<ClockCircleOutlined />} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic title="检查点" value={board?.totalCheckpoints ?? 0} prefix={<EnvironmentOutlined />} />
              </Card>
            </Col>
          </Row>

          {board?.course.started && (
            <Card
              className="punch-panel"
              title="打卡台（赛事进行中）"
              extra={
                <Input
                  placeholder="输入队伍编号，如 1"
                  value={teamIdInput}
                  onChange={(event) => setTeamIdInput(event.target.value.replace(/[^0-9]/g, ""))}
                  style={{ width: 200 }}
                  prefix="#"
                />
              }
            >
              {myTeam && (
                <Alert
                  className="punch-team-alert"
                  type={myTeam.finished ? "success" : "info"}
                  showIcon
                  message={
                    myTeam.finished
                      ? `#${myTeam.teamId} ${myTeam.teamName} 已完赛，总用时 ${myTeam.totalTimeLabel}`
                      : `#${myTeam.teamId} ${myTeam.teamName} 已打卡 ${myTeam.punchCount}/${myTeam.checkpointCount}`
                  }
                />
              )}
              <Space wrap>
                {checkpoints.map((cp) => {
                  const done = punchedSet.has(cp.code);
                  return (
                    <Button
                      key={cp.id}
                      type={done ? "primary" : "default"}
                      ghost={done}
                      disabled={!teamIdInput || myTeam?.finished}
                      loading={punchingCode === cp.code}
                      onClick={() => void handlePunch(cp.code)}
                    >
                      CP{cp.order} · {cp.code} · {cp.name}
                      {done ? " ✓" : ""}
                    </Button>
                  );
                })}
              </Space>
              <p className="muted punch-hint">
                输入报名成功后获得的队伍编号，依次点击到达的检查点完成打卡；重复打卡会被拒绝。
              </p>
            </Card>
          )}

          <Card title="总用时榜（走完全部检查点）" className="board-card">
            <Table
              rowKey="teamId"
              columns={finishedColumns}
              dataSource={board?.finished ?? []}
              loading={loading}
              pagination={false}
              size="middle"
              locale={{ emptyText: "尚无走完全部检查点的队伍" }}
            />
          </Card>

          <Card title="缺卡队伍（进行中）" className="board-card">
            <Table
              rowKey="teamId"
              columns={ongoingColumns}
              dataSource={board?.ongoing ?? []}
              loading={loading}
              pagination={false}
              size="middle"
              locale={{ emptyText: "所有队伍都已完成全部打卡 🎉" }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
