import { useState } from "react";
import {
  Card,
  Upload,
  Button,
  Tabs,
  Table,
  Tag,
  Progress,
  message,
  Space,
  Result,
  Alert,
} from "antd";
import { InboxOutlined, UploadOutlined, CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";
import apiClient from "../api/client";

const { Dragger } = Upload;

/* ─────────── Store Mapping Section ─────────── */

type UploadState = "idle" | "uploading" | "done" | "error";

function StoreMappingSection() {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [coverage, setCoverage] = useState(0);

  const uploadFile = async (file: File) => {
    setState("uploading");
    setProgress(0);
    const form = new FormData();
    form.append("file", file);
    try {
      setProgress(60);
      const { data } = await apiClient.post("/store/mapping/upload", form);
      setProgress(100);
      setResult(data);
      setState("done");
      message.success(`门店映射表已导入: ${data.inserted} 条记录`);
      const r2 = await apiClient.get("/store/mapping/unmatched");
      setUnmatched(r2.data.unmatched_merchants || []);
      setCoverage(r2.data.coverage ?? 0);
    } catch (e: any) {
      message.error("上传失败: " + (e?.response?.data?.detail || e.message));
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <Result
        status={unmatched.length > 0 ? "warning" : "success"}
        title="门店映射导入完成"
        subTitle={`共导入 ${result?.inserted ?? 0} 条映射记录`}
        extra={[
          <Button key="again" onClick={() => { setState("idle"); setResult(null); }}>
            重新上传
          </Button>,
        ]}
      >
        {unmatched.length > 0 && (
          <Card size="small" title="映射覆盖情况" style={{ marginTop: 16 }}>
            <Alert
              type="warning"
              message={`映射覆盖率: ${(coverage * 100).toFixed(0)}% — ${unmatched.length} 个门店未匹配`}
              style={{ marginBottom: 12 }}
            />
            <Table
              dataSource={unmatched.map((s, i) => ({ key: i, name: s }))}
              columns={[{ title: "未匹配门店", dataIndex: "name", key: "name" }]}
              size="small"
              pagination={{ pageSize: 5 }}
            />
          </Card>
        )}
      </Result>
    );
  }

  if (state === "error") {
    return (
      <Result
        status="error"
        title="上传失败"
        extra={<Button type="primary" onClick={() => setState("idle")}>重试</Button>}
      />
    );
  }

  return (
    <div>
      <Dragger
        accept=".xlsx,.xls"
        maxCount={1}
        beforeUpload={(file) => { uploadFile(file); return false; }}
        showUploadList={false}
        disabled={state === "uploading"}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">点击或拖拽门店映射表到此处上传</p>
        <p className="ant-upload-hint">支持 .xlsx / .xls 格式</p>
      </Dragger>
      {state === "uploading" && (
        <Card style={{ marginTop: 16 }}>
          <Progress percent={progress} status="active" />
          <p style={{ marginTop: 8, color: "#8c8c8c" }}>正在导入门店映射数据...</p>
        </Card>
      )}
      <Card size="small" style={{ marginTop: 16 }}>
        <p style={{ fontWeight: 500 }}>表格格式说明：</p>
        <p style={{ color: "#8c8c8c", fontSize: 13 }}>
          包含以下列：商户名称（必填）、大区、省份、城市、是否零售、门店总经理<br />
          系统会自动识别列名进行映射，上传后将覆盖所有现有门店映射数据。
        </p>
      </Card>
    </div>
  );
}

/* ─────────── Car Series Mapping Section ─────────── */

function CarSeriesMappingSection() {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [coverage, setCoverage] = useState(0);

  const uploadFile = async (file: File) => {
    setState("uploading");
    setProgress(0);
    const form = new FormData();
    form.append("file", file);
    try {
      setProgress(60);
      const { data } = await apiClient.post("/car-series/mapping/upload", form);
      setProgress(100);
      setResult(data);
      setState("done");
      message.success(`车系映射表已导入: ${data.inserted} 条记录`);
      const r2 = await apiClient.get("/car-series/mapping/unmatched");
      setUnmatched(r2.data.unmatched_series || []);
      setCoverage(r2.data.coverage ?? 0);
    } catch (e: any) {
      message.error("上传失败: " + (e?.response?.data?.detail || e.message));
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <Result
        status={unmatched.length > 0 ? "warning" : "success"}
        title="车系映射导入完成"
        subTitle={`共导入 ${result?.inserted ?? 0} 条映射记录`}
        extra={[
          <Button key="again" onClick={() => { setState("idle"); setResult(null); }}>
            重新上传
          </Button>,
        ]}
      >
        {unmatched.length > 0 && (
          <Card size="small" title="映射覆盖情况" style={{ marginTop: 16 }}>
            <Alert
              type="warning"
              message={`映射覆盖率: ${(coverage * 100).toFixed(0)}% — ${unmatched.length} 个车系未匹配`}
              style={{ marginBottom: 12 }}
            />
            <Table
              dataSource={unmatched.slice(0, 100).map((s, i) => ({ key: i, name: s }))}
              columns={[{ title: "未匹配车系", dataIndex: "name", key: "name" }]}
              size="small"
              pagination={{ pageSize: 5 }}
            />
          </Card>
        )}
      </Result>
    );
  }

  if (state === "error") {
    return (
      <Result
        status="error"
        title="上传失败"
        extra={<Button type="primary" onClick={() => setState("idle")}>重试</Button>}
      />
    );
  }

  return (
    <div>
      <Dragger
        accept=".xlsx,.xls"
        maxCount={1}
        beforeUpload={(file) => { uploadFile(file); return false; }}
        showUploadList={false}
        disabled={state === "uploading"}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">点击或拖拽车系映射表到此处上传</p>
        <p className="ant-upload-hint">支持 .xlsx / .xls 格式</p>
      </Dragger>
      {state === "uploading" && (
        <Card style={{ marginTop: 16 }}>
          <Progress percent={progress} status="active" />
          <p style={{ marginTop: 8, color: "#8c8c8c" }}>正在导入车系映射数据...</p>
        </Card>
      )}
      <Card size="small" style={{ marginTop: 16 }}>
        <p style={{ fontWeight: 500 }}>表格格式说明：</p>
        <p style={{ color: "#8c8c8c", fontSize: 13 }}>
          包含以下列：原始车系（必填）、标准车系、品牌<br />
          系统会自动识别列名进行映射，上传后将覆盖所有现有车系映射数据。<br />
          用于将底表中混乱的车系名称清洗为标准名称。
        </p>
      </Card>
    </div>
  );
}

/* ─────────── Main Page ─────────── */

export default function MappingPage() {
  const tabItems = [
    {
      key: "store",
      label: <span><UploadOutlined /> 门店信息映射</span>,
      children: <StoreMappingSection />,
    },
    {
      key: "car-series",
      label: <span><UploadOutlined /> 车系映射</span>,
      children: <CarSeriesMappingSection />,
    },
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <Card>
        <Tabs defaultActiveKey="store" size="large" items={tabItems} />
      </Card>
    </div>
  );
}