import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Popconfirm,
  Progress,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  FieldTimeOutlined,
  FlagOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { fetchCourses, startRace } from "../api/client";
import {
  COURSE_STATUS_TEXT,
  DIFFICULTY_COLOR,
  REQUEST_MESSAGES,
} from "../constants/messages";
import type { Course, Team } from "../types";
import { RegisterModal } from "./RegisterModal";

interface CoursesPageProps {
  onViewLeaderboard: (courseId: number) => void;
}

const STATUS_COLOR: Record<string, string> = {
  open: "green",
  closed: "default",
  started: "processing",
};

export function CoursesPage({ onViewLeaderboard }: CoursesPageProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerTarget, setRegisterTarget] = useState<Course | null>(null);
  const [startingId, setStartingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCourses(await fetchCourses());
    } catch {
      message.error(REQUEST_MESSAGES.loadCoursesFailed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStart = async (course: Course) => {
    setStartingId(course.id);
    try {
      await startRace(course.id);
      message.success(REQUEST_MESSAGES.startSuccess);
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "开赛失败");
    } finally {
      setStartingId(null);
    }
  };

  const handleRegistered = (_team: Team) => {
    setRegisterTarget(null);
    void load();
  };

  if (loading) {
    return <Spin className="page-spin" size="large" tip="加载线路中…" />;
  }

  if (courses.length === 0) {
    return <Empty description="暂未发布线路" />;
  }

  return (
    <div>
      <div className="page-toolbar">
        <Typography.Title level={3} style={{ margin: 0 }}>
          赛事线路
        </Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新余位
        </Button>
      </div>

      <Row gutter={[18, 18]}>
        {courses.map((course) => {
          const full = course.remainingSlots === 0;
          const percent = Math.round(
            (course.registeredTeams / course.capacity) * 100
          );
          return (
            <Col xs={24} md={12} xl={8} key={course.id}>
              <Card
                className="course-card"
                title={
                  <Space direction="vertical" size={4}>
                    <Space wrap>
                      <Tag color={DIFFICULTY_COLOR[course.difficulty]}>
                        {course.difficultyLabel}
                      </Tag>
                      <Tag color={STATUS_COLOR[course.status]}>
                        {COURSE_STATUS_TEXT[course.status]}
                      </Tag>
                    </Space>
                    <span>{course.name}</span>
                  </Space>
                }
                actions={[
                  <Button
                    key="register"
                    type="primary"
                    ghost
                    disabled={course.status !== "open" || full}
                    onClick={() => setRegisterTarget(course)}
                  >
                    {course.status === "started"
                      ? "赛事已开始"
                      : course.status === "closed"
                        ? "报名已截止"
                        : full
                          ? "名额已满"
                          : "立即报名"}
                  </Button>,
                  <Button
                    key="board"
                    type="text"
                    icon={<TrophyOutlined />}
                    onClick={() => onViewLeaderboard(course.id)}
                  >
                    查看排名
                  </Button>,
                  !course.started ? (
                    <Popconfirm
                      key="start"
                      title="开始赛事？"
                      description="开赛后报名关闭，队伍即可打卡。"
                      onConfirm={() => void handleStart(course)}
                      okButtonProps={{ loading: startingId === course.id }}
                    >
                      <Button type="text" danger icon={<ThunderboltOutlined />}>
                        开始赛事
                      </Button>
                    </Popconfirm>
                  ) : (
                    <span key="started-flag" className="card-action-muted">
                      <FlagOutlined /> 打卡中
                    </span>
                  ),
                ]}
              >
                <p className="course-desc">{course.description}</p>
                <div className="course-meta">
                  <span>
                    <FieldTimeOutlined /> 报名截止：
                    {course.registerDeadline.replace("T", " ").slice(0, 16)}
                  </span>
                  <span>检查点：{course.checkpointCount} 个 CP</span>
                </div>
                <div className="capacity-block">
                  <div className="capacity-line">
                    <span>
                      已报名 <strong>{course.registeredTeams}</strong> /{" "}
                      {course.capacity} 队
                    </span>
                    <Typography.Text type={full ? "danger" : "success"} strong>
                      余位 {course.remainingSlots}
                    </Typography.Text>
                  </div>
                  <Progress
                    percent={percent}
                    showInfo={false}
                    strokeColor={full ? "#cf1322" : { from: "#3d6b72", to: "#b14f3b" }}
                  />
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <RegisterModal
        open={registerTarget !== null}
        course={registerTarget}
        onClose={() => setRegisterTarget(null)}
        onRegistered={handleRegistered}
      />
    </div>
  );
}
