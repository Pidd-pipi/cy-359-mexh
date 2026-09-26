import { useEffect, useState } from "react";
import { Alert, Button, Progress, Select, Table, Tag, Typography } from "antd";
import { CrownOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { fetchLeaderboard } from "../api/client";
import type { InProgressEntry, LeaderboardEntry, LeaderboardResponse, RaceRoute } from "../types";
import { formatDateTime, formatDuration } from "../utils/format";

const RANK_COLORS = ["gold", "silver", "#cd7f32"];

interface LeaderboardPanelProps {
  routes: RaceRoute[];
}

export function LeaderboardPanel({ routes }: LeaderboardPanelProps) {
  const [routeId, setRouteId] = useState<number | undefined>(undefined);
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveRouteId = routeId ?? routes[0]?.id;

  const load = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      setBoard(await fetchLeaderboard(id));
    } catch {
      setError("排名数据加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveRouteId === undefined) return;
    load(effectiveRouteId);
    const timer = window.setInterval(() => load(effectiveRouteId), 15000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRouteId]);

  const finishedColumns: ColumnsType<LeaderboardEntry> = [
    {
      title: "名次",
      dataIndex: "rank",
      key: "rank",
      width: 80,
      render: (value: number) => (
        <Tag color={RANK_COLORS[value - 1] ?? "default"} style={{ minWidth: 44, textAlign: "center" }}>
          {value <= 3 ? <CrownOutlined /> : null} {value}
        </Tag>
      ),
    },
    { title: "队伍", dataIndex: "teamName", key: "teamName" },
    {
      title: "成员",
      dataIndex: "members",
      key: "members",
      render: (value: string[]) => value.join("、"),
    },
    {
      title: "总用时",
      dataIndex: "totalSeconds",
      key: "totalSeconds",
      width: 120,
      render: (value: number) => <strong>{formatDuration(value)}</strong>,
    },
    {
      title: "完成时间",
      dataIndex: "finishedAt",
      key: "finishedAt",
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
  ];

  const progressColumns: ColumnsType<InProgressEntry> = [
    { title: "队伍", dataIndex: "teamName", key: "teamName" },
    {
      title: "成员",
      dataIndex: "members",
      key: "members",
      render: (value: string[]) => value.join("、"),
    },
    {
      title: "打卡进度",
      key: "progress",
      width: 220,
      render: (_, record) => (
        <Progress
          percent={Math.round((record.doneCheckpoints / Math.max(record.totalCheckpoints, 1)) * 100)}
          format={() => `${record.doneCheckpoints}/${record.totalCheckpoints}`}
          size="small"
        />
      ),
    },
    {
      title: "状态",
      key: "status",
      width: 100,
      render: () => <Tag color="processing">进行中</Tag>,
    },
    {
      title: "最近打卡",
      dataIndex: "lastCheckinAt",
      key: "lastCheckinAt",
      width: 170,
      render: (value: string | null) => formatDateTime(value),
    },
  ];

  return (
    <section className="work-panel">
      <div className="panel-header">
        <Typography.Title level={3} style={{ margin: 0 }}>
          总用时榜
        </Typography.Title>
        <div className="panel-actions">
          <Select
            style={{ minWidth: 220 }}
            placeholder="选择线路"
            value={effectiveRouteId}
            onChange={(value) => setRouteId(value)}
            options={routes.map((route) => ({ value: route.id, label: route.name }))}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => effectiveRouteId !== undefined && load(effectiveRouteId)}
            loading={loading}
          >
            刷新
          </Button>
        </div>
      </div>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      {board && !board.started && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`赛事尚未开始，开赛时间：${formatDateTime(board.route.startTime)}，完赛后自动生成总用时榜。`}
        />
      )}
      <Table<LeaderboardEntry>
        columns={finishedColumns}
        dataSource={board?.finished ?? []}
        loading={loading}
        pagination={false}
        rowKey="teamId"
        locale={{ emptyText: "暂无完赛队伍" }}
      />
      <Typography.Title level={4} style={{ marginTop: 24 }}>
        进行中（缺卡队伍）
      </Typography.Title>
      <Table<InProgressEntry>
        columns={progressColumns}
        dataSource={board?.inProgress ?? []}
        loading={loading}
        pagination={false}
        rowKey="teamId"
        locale={{ emptyText: "暂无进行中的队伍" }}
      />
    </section>
  );
}
