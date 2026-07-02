import { Grid, Layout } from "antd";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import SideMenu from "./SideMenu";
import HeaderBar from "./HeaderBar";
import UserMenu from "../auth/UserMenu";

const { Content, Sider } = Layout;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const screens = Grid.useBreakpoint();
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  const showGlobalFilters = !["/store-analysis", "/people-analysis/individual", "/mapping", "/upload"].includes(location.pathname);
  const isNarrow = screens.md === false;
  const collapsed = isNarrow || desktopCollapsed;

  useEffect(() => {
    const previous = previousPath.current;
    sessionStorage.setItem(`cgj-scroll-v1:${previous}`, String(window.scrollY));
    previousPath.current = location.pathname;
    const saved = Number(sessionStorage.getItem(`cgj-scroll-v1:${location.pathname}`) || 0);
    requestAnimationFrame(() => window.scrollTo({ top: saved }));
  }, [location.pathname]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        collapsedWidth={64}
        onCollapse={setDesktopCollapsed}
        trigger={isNarrow ? null : undefined}
        width={220}
        style={{ boxShadow: "2px 0 8px rgba(0,0,0,0.06)" }}
      >
        <div
          style={{
            height: 48,
            margin: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "#fff",
              fontSize: collapsed ? 16 : 18,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {collapsed ? "车" : "车管家数据看板"}
          </span>
        </div>
        <SideMenu />
        <div
          style={{
            position: "absolute",
            left: collapsed ? 10 : 16,
            bottom: isNarrow ? 12 : 52,
          }}
        >
          <UserMenu collapsed={collapsed} />
        </div>
      </Sider>
      <Layout>
        {showGlobalFilters ? <div className="sticky-global-filters"><HeaderBar /></div> : null}
        <Content style={{ margin: isNarrow ? 10 : 16, overflow: "auto" }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
