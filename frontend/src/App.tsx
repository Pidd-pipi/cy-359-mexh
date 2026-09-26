import { useState } from "react";
import { ConfigProvider, Layout, Tabs, Typography, theme } from "antd";
import { CompassOutlined, TrophyOutlined } from "@ant-design/icons";
import { APP_CODE, APP_NAME, APP_THEME } from "./constants/app";
import { CoursesPage } from "./components/CoursesPage";
import { LeaderboardPage } from "./components/LeaderboardPage";

const { Header, Content } = Layout;

type PageKey = "courses" | "leaderboard";

export default function App() {
  const [page, setPage] = useState<PageKey>("courses");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

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
          <Typography.Text className="topbar-sub">
            团队报名 · 名额抢占 · 打卡计时 · 实时排名
          </Typography.Text>
        </Header>
        <Content className="workspace">
          <Tabs
            className="page-tabs"
            activeKey={page}
            onChange={(key) => setPage(key as PageKey)}
            items={[
              {
                key: "courses",
                label: (
                  <span>
                    <CompassOutlined /> 线路与报名
                  </span>
                ),
                children: (
                  <CoursesPage
                    onViewLeaderboard={(courseId) => {
                      setSelectedCourseId(courseId);
                      setPage("leaderboard");
                    }}
                  />
                ),
              },
              {
                key: "leaderboard",
                label: (
                  <span>
                    <TrophyOutlined /> 实时排名
                  </span>
                ),
                children: (
                  <LeaderboardPage
                    selectedCourseId={selectedCourseId}
                    onSelectCourse={setSelectedCourseId}
                  />
                ),
              },
            ]}
          />
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
