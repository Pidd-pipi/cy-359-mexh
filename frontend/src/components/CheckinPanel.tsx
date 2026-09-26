import { useEffect, useState } from "react";
import { Alert, Button, List, Select, Space, Tag, Typography, message } from "antd";
import { CheckCircleOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { ApiError, createCheckin, fetchRouteDetail, fetchTeamCheckins } from "../api/client";
import { REQUEST_MESSAGES } from "../constants/messages";
import type { RaceRoute, RouteDetail, TeamCheckin } from "../types";
import { formatDateTime } from "../utils/format";

interface CheckinPanelProps {
  routes: RaceRoute[];
  onCheckinDone: () => void;
}

export function CheckinPanel({ routes, onCheckinDone }: CheckinPanelProps) {
  const [routeId, setRouteId] = useState<number | undefined>(undefined);
  const [detail, setDetail] = useState<RouteDetail | null>(null);
  const [teamId, setTeamId] = useState<number | undefined>(undefined);
  const [checkpointId, setCheckpointId] = useState<number | undefined>(undefined);
  const [checkins, setCheckins] = useState<TeamCheckin[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveRouteId = routeId ?? routes[0]?.id;

  useEffect(() => {
    if (effectiveRouteId === undefined) return;
    setError(null);
    fetchRouteDetail(effectiveRouteId)
      .then((data) => {
        setDetail(data);
        setTeamId(undefined);
        setCheckpointId(undefined);
        setCheckins([]);
      })
      .catch(() => setError("线路详情加载失败。"));
  }, [effectiveRouteId]);

  useEffect(() => {
    if (teamId === undefined) {
      setCheckins([]);
      return;
    }
    fetchTeamCheckins(teamId)
      .then(setCheckins)
      .catch(() => setCheckins([]));
  }, [teamId]);

  const handleCheckin = async () => {
    if (teamId === undefined || checkpointId === undefined) return;
    setSubmitting(true);
    setError(null);
    try {
      const record = await createCheckin(teamId, checkpointId);
      message.success(record.created ? REQUEST_MESSAGES.checkinSuccess : REQUEST_MESSAGES.checkinDuplicate);
      setCheckins(await fetchTeamCheckins(teamId));
      onCheckinDone();
    } catch (err) {
      const text = err instanceof ApiError ? err.message : "打卡失败，请稍后重试";
      setError(text);
      message.error(text);
    } finally {
      setSubmitting(false);
    }
  };

  const notStarted = detail !== null && detail.status !== "赛事进行中";

  return (
    <section className="work-panel">
      <div className="panel-header">
        <Typography.Title level={3} style={{ margin: 0 }}>
          现场打卡
        </Typography.Title>
      </div>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      {notStarted && detail && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`「${detail.name}」尚未开赛（${formatDateTime(detail.startTime)}），开赛后才能打卡。`}
        />
      )}
      <Space wrap size="middle" style={{ marginBottom: 16 }}>
        <Select
          style={{ minWidth: 200 }}
          placeholder="选择线路"
          value={effectiveRouteId}
          onChange={(value) => setRouteId(value)}
          options={routes.map((route) => ({ value: route.id, label: route.name }))}
        />
        <Select
          style={{ minWidth: 200 }}
          placeholder="选择队伍"
          value={teamId}
          onChange={(value) => setTeamId(value)}
          options={(detail?.teams ?? []).map((team) => ({
            value: team.id,
            label: `${team.name}（${team.members.join("、")}）`,
          }))}
        />
        <Select
          style={{ minWidth: 220 }}
          placeholder="选择打卡点"
          value={checkpointId}
          onChange={(value) => setCheckpointId(value)}
          options={(detail?.checkpoints ?? []).map((cp) => ({
            value: cp.id,
            label: `CP${cp.seq} · ${cp.name}`,
          }))}
        />
        <Button
          type="primary"
          icon={<EnvironmentOutlined />}
          disabled={teamId === undefined || checkpointId === undefined || notStarted}
          loading={submitting}
          onClick={handleCheckin}
        >
          确认打卡
        </Button>
      </Space>
      {teamId !== undefined && (
        <List
          size="small"
          header={<strong>本队打卡记录</strong>}
          dataSource={checkins}
          locale={{ emptyText: "暂无打卡记录" }}
          renderItem={(item) => (
            <List.Item>
              <Space>
                <CheckCircleOutlined style={{ color: "#3d6b72" }} />
                <Tag>{`CP${item.checkpointSeq}`}</Tag>
                <span>{item.checkpointName}</span>
              </Space>
              <span>{formatDateTime(item.checkedAt)}</span>
            </List.Item>
          )}
        />
      )}
    </section>
  );
}
