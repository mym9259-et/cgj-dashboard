import { useLocation, useNavigate } from "react-router-dom";
import { Menu } from "antd";
import {
  UploadOutlined,
  DashboardOutlined,
  FunnelPlotOutlined,
  PieChartOutlined,
  TeamOutlined,
  SwapOutlined,
} from "@ant-design/icons";

const menuItems = [
  { key: "/upload", icon: <UploadOutlined />, label: "数据上传" },
  { key: "/dashboard", icon: <DashboardOutlined />, label: "概览看板" },
  { key: "/funnel", icon: <FunnelPlotOutlined />, label: "转化漏斗" },
  { key: "/orders", icon: <PieChartOutlined />, label: "订单结构" },
  { key: "/performance", icon: <TeamOutlined />, label: "人员业绩" },
  { key: "/compare", icon: <SwapOutlined />, label: "对比看板" },
];

export default function SideMenu() {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = location.pathname.startsWith("/performance/")
    ? "/performance"
    : location.pathname;

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selectedKey]}
      items={menuItems}
      onClick={({ key }) => navigate(key)}
    />
  );
}
