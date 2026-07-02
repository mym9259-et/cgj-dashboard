import { useLocation, useNavigate } from "react-router-dom";
import { Menu } from "antd";
import {
  UploadOutlined,
  DashboardOutlined,
  AuditOutlined,
  TeamOutlined,
  SwapOutlined,
  ShopOutlined,
} from "@ant-design/icons";

const menuItems = [
  { key: "/mapping", icon: <AuditOutlined />, label: "映射管理" },
  { key: "/upload", icon: <UploadOutlined />, label: "数据上传" },
  { key: "/dashboard", icon: <DashboardOutlined />, label: "概览看板" },
  { key: "/store-analysis", icon: <ShopOutlined />, label: "门店分析" },
  { key: "people", icon: <TeamOutlined />, label: "人员分析", children: [
    { key: "/people-analysis", label: "人员总览" },
    { key: "/people-analysis/individual", label: "个人分析" },
  ] },
  { key: "/compare", icon: <SwapOutlined />, label: "对比看板" },
];

export default function SideMenu() {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = location.pathname.startsWith("/people-analysis/individual") ? "/people-analysis/individual" : location.pathname;

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selectedKey]}
      defaultOpenKeys={["people"]}
      items={menuItems}
      onClick={({ key }) => navigate(key)}
    />
  );
}
