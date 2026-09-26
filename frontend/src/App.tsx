import { useCallback, useEffect, useState } from "react";
import { Button, ConfigProvider, Layout, Menu, Typography, theme } from "antd";
import { ApiOutlined } from "@ant-design/icons";
import { fetchOverview, fetchRoutes } from "./api/client";
import { APP_CODE, APP_NAME, APP_THEME } from "./constants/app";
import { REQUEST_MESSAGES } from "./constants/messages";
import { createFallbackOverview } from "./state/dashboard";
import type { OverviewResponse, RaceRoute } from "./types";
import { FeatureStrip } from "./components/FeatureStrip";
import { MetricGrid } from "./components/MetricGrid";
import { OperationsTable } from "./components/OperationsTable";
import { RouteBoard } from "./components/RouteBoard";
import { RegisterTeamModal } from "./components/RegisterTeamModal";
import { LeaderboardPanel } from "./components/LeaderboardPanel";
import { CheckinPanel } from "./components/CheckinPanel";

const { Header, Content } = Layout;

const NAV_ITEMS = [
  { key: "overview", label: "运营总览" },
  { key: "routes", label: "线路报名" },
  { key: "race", label: "排名打卡" },
];

export default function App() {
  const [overview, setOverview] = useState<OverviewResponse>(createFallbackOverview());
  const [notice, setNotice] = useState(REQUEST_MESSAGES.overviewFallback);
  const [page, setPage] = useState("overview");
  const [routes, setRoutes] = useState<RaceRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [registerTarget, setRegisterTarget] = useState<RaceRoute | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    fetchOverview()
      .then((payload) => {
        setOverview(payload);
        setNotice("后端服务已联通，当前展示实时接口数据。");
      })
      .catch(() => setNotice(REQUEST_MESSAGES.overviewFallback));
  }, []);

  const loadRoutes = useCallback(() => {
    setRoutesLoading(true);
    fetchRoutes()
      .then(setRoutes)
      .catch(() => setRoutes([]))
      .finally(() => setRoutesLoading(false));
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const openRegister = (route: RaceRoute) => {
    setRegisterTarget(route);
    setRegisterOpen(true);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: APP_THEME.accent,
          colorText: APP_THEME.ink,
          colorBgBase: APP_THEME.paper,
          borderRadius: 8,
        },
      }}
    >
      <Layout className="app-shell">
        <Header className="topbar">
          <div className="brand-block">
            <span className="brand-code">{APP_CODE}</span>
            <h1 className="brand-title">{APP_NAME}</h1>
          </div>
          <Menu
            className="nav-menu"
            mode="horizontal"
            selectedKeys={[page]}
            items={NAV_ITEMS}
            onClick={({ key }) => setPage(key)}
          />
          <Button type="primary" icon={<ApiOutlined />} href={REQUEST_MESSAGES.healthPath}>
            API Health
          </Button>
        </Header>
        <Content className="workspace">
          {page === "overview" && (
            <>
              <section className="lead-grid">
                <article className="hero-panel">
                  <span className="pill">{notice}</span>
                  <Typography.Title level={2}>{overview.appName}</Typography.Title>
                  <p>{overview.description}</p>
                </article>
                <MetricGrid items={overview.kpis} />
              </section>
              <FeatureStrip items={overview.features} />
              <section className="work-panel">
                <Typography.Title level={3}>运营任务流</Typography.Title>
                <OperationsTable records={overview.records} />
              </section>
            </>
          )}
          {page === "routes" && (
            <RouteBoard
              routes={routes}
              loading={routesLoading}
              onRefresh={loadRoutes}
              onRegister={openRegister}
            />
          )}
          {page === "race" && (
            <>
              <LeaderboardPanel routes={routes} />
              <CheckinPanel routes={routes} onCheckinDone={loadRoutes} />
            </>
          )}
        </Content>
        <RegisterTeamModal
          route={registerTarget}
          open={registerOpen}
          onClose={() => setRegisterOpen(false)}
          onSuccess={loadRoutes}
        />
      </Layout>
    </ConfigProvider>
  );
}
