import { useState } from "react";
import { Alert, Button, Form, Input } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import "./LoginPage.css";

type LoginValues = {
  username: string;
  password: string;
};

export default function LoginPage() {
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    setError(undefined);
    try {
      await login(values.username.trim(), values.password);
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || "用户名或密码错误");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <header>
          <div className="login-mark">车</div>
          <div>
            <h1>车管家数据看板</h1>
            <span>安全登录</span>
          </div>
        </header>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        <Form<LoginValues> layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input prefix={<UserOutlined />} autoComplete="username" size="large" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block size="large">
            登录
          </Button>
        </Form>
      </section>
    </main>
  );
}
