import { Badge, Button, Table, Tag, Tooltip, Typography } from "antd";
import { ReloadOutlined, TeamOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { RaceRoute } from "../types";
import { formatDateTime } from "../utils/format";

const DIFFICULTY_COLORS: Record<string, string> = {
  family: "green",
  adult: "orange",
  pro: "red",
};

const STATUS_COLORS: Record<string, string> = {
  报名中: "processing",
  报名截止: "warning",
  赛事进行中: "success",
};

interface RouteBoardProps {
  routes: RaceRoute[];
  loading: boolean;
  onRefresh: () => void;
  onRegister: (route: RaceRoute) => void;
}

export function RouteBoard({ routes, loading, onRefresh, onRegister }: RouteBoardProps) {
  const columns: ColumnsType<RaceRoute> = [
    {
      title: "线路",
      dataIndex: "name",
      key: "name",
      render: (value: string, record) => (
        <div>
          <strong>{value}</strong>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.checkpointCount} 个检查点 · {record.description}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: "难度",
      dataIndex: "difficultyLabel",
      key: "difficulty",
      width: 90,
      render: (value: string, record) => (
        <Tag color={DIFFICULTY_COLORS[record.difficulty] ?? "default"}>{value}</Tag>
      ),
    },
    {
      title: "名额（已报/总数）",
      key: "quota",
      width: 150,
      render: (_, record) => (
        <span>
          {record.registered} / {record.quota}
        </span>
      ),
    },
    {
      title: "余位",
      dataIndex: "remaining",
      key: "remaining",
      width: 90,
      render: (value: number) =>
        value > 0 ? (
          <Badge count={value} color="#3d6b72" overflowCount={999} />
        ) : (
          <Tag color="red">名额已满</Tag>
        ),
    },
    {
      title: "报名截止",
      dataIndex: "registrationDeadline",
      key: "registrationDeadline",
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "开赛时间",
      dataIndex: "startTime",
      key: "startTime",
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (value: string) => <Tag color={STATUS_COLORS[value] ?? "default"}>{value}</Tag>,
    },
    {
      title: "操作",
      key: "action",
      width: 110,
      render: (_, record) => {
        const closed = record.status !== "报名中";
        const full = record.remaining <= 0;
        const disabled = closed || full;
        const button = (
          <Button
            type="primary"
            size="small"
            icon={<TeamOutlined />}
            disabled={disabled}
            onClick={() => onRegister(record)}
          >
            报名
          </Button>
        );
        if (!disabled) return button;
        return <Tooltip title={closed ? "报名已截止" : "名额已满"}>{button}</Tooltip>;
      },
    },
  ];

  return (
    <section className="work-panel">
      <div className="panel-header">
        <Typography.Title level={3} style={{ margin: 0 }}>
          线路与余位
        </Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          刷新余位
        </Button>
      </div>
      <Table<RaceRoute>
        columns={columns}
        dataSource={routes}
        loading={loading}
        pagination={false}
        rowKey="id"
      />
    </section>
  );
}
