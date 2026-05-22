import { Layout } from "antd";
import { useState } from "react";
import SideMenu from "./SideMenu";
import HeaderBar from "./HeaderBar";

const { Content, Sider } = Layout;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed] = useState(false);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
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
      </Sider>
      <Layout>
        <HeaderBar />
        <Content style={{ margin: 16, overflow: "auto" }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
