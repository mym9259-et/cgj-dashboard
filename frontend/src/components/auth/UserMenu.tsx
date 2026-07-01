import { useState } from "react";
import { Button, Dropdown, Form, Input, message, Modal, Tag } from "antd";
import {
  KeyOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { changePassword, resetUserPassword } from "../../api/auth";
import { useAuth } from "../../contexts/AuthContext";

type PasswordValues = {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
};

export default function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<"self" | "reset" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<PasswordValues>();

  if (!user) return null;

  const submitPassword = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (mode === "self") {
        await changePassword(values.currentPassword || "", values.newPassword);
        message.success("管理员密码已修改");
      } else {
        await resetUserPassword("cgj", values.newPassword);
        message.success("cgj 密码已重置，旧登录已失效");
      }
      setMode(null);
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.detail || "密码操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const adminItems = user.role === "admin" ? [
    { key: "self", icon: <KeyOutlined />, label: "修改我的密码" },
    { key: "reset", icon: <SafetyCertificateOutlined />, label: "重置 cgj 密码" },
    { type: "divider" as const },
  ] : [];

  return (
    <>
      <Dropdown
        placement="topLeft"
        trigger={["click"]}
        menu={{
          items: [
            ...adminItems,
            { key: "logout", icon: <LogoutOutlined />, label: "退出登录", danger: true },
          ],
          onClick: ({ key }) => {
            if (key === "logout") logout();
            else {
              form.resetFields();
              setMode(key as "self" | "reset");
            }
          },
        }}
      >
        <Button
          type="text"
          icon={<UserOutlined />}
          title={user.username}
          style={{
            width: collapsed ? 44 : 188,
            height: 42,
            color: "rgba(255,255,255,0.85)",
            textAlign: "left",
          }}
        >
          {collapsed ? null : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              {user.username}
              {user.role === "admin" ? <Tag color="blue" style={{ margin: 0 }}>管理员</Tag> : null}
            </span>
          )}
        </Button>
      </Dropdown>

      <Modal
        title={mode === "self" ? "修改管理员密码" : "重置 cgj 密码"}
        open={mode !== null}
        onCancel={() => {
          setMode(null);
          form.resetFields();
        }}
        onOk={submitPassword}
        confirmLoading={submitting}
        okText="确认"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          {mode === "self" ? (
            <Form.Item name="currentPassword" label="当前密码" rules={[{ required: true, message: "请输入当前密码" }]}>
              <Input.Password autoComplete="current-password" />
            </Form.Item>
          ) : null}
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 12, message: "密码长度不能少于12位" },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "请再次输入新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value || getFieldValue("newPassword") === value
                    ? Promise.resolve()
                    : Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
