import { useEffect, useState } from "react";
import { Button, Card, Input, message, Popconfirm, Space, Switch, Table, Tabs, Tag, Upload } from "antd";
import { DeleteOutlined, DownloadOutlined, PlusOutlined, SaveOutlined, UploadOutlined } from "@ant-design/icons";
import apiClient from "../api/client";
import { useAuth } from "../contexts/AuthContext";

type MappingType = "store" | "car-series" | "personnel";
type ColumnMeta = { key: string; label: string };
type MappingPayload = { metadata: { columns: ColumnMeta[]; row_count: number; source_type: string | null; source_filename: string | null; updated_by: string | null; updated_at: string | null }; rows: Record<string, any>[] };

const LABELS: Record<MappingType, string> = { store: "门店信息映射", "car-series": "车系映射", personnel: "人员信息映射" };

function MappingEditor({ type }: { type: MappingType }) {
  const { user } = useAuth();
  const editable = user?.role === "admin";
  const [payload, setPayload] = useState<MappingPayload | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/mapping-admin/${type}`);
      setPayload(data);
      setRows(data.rows.map((row: Record<string, any>) => ({ ...row, _key: row.id || crypto.randomUUID() })));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [type]);

  const update = (key: string, field: string, value: any) => setRows((current) => current.map((row) => row._key === key ? { ...row, [field]: value } : row));
  const columns = (payload?.metadata.columns || []).map((column) => ({
    title: column.label, dataIndex: column.key, key: column.key, width: column.key === "merchant_name" ? 260 : 150,
    render: (value: any, row: Record<string, any>) => column.key === "is_active"
      ? <Switch size="small" checked={Boolean(value)} disabled={!editable} checkedChildren="在职" unCheckedChildren="离职" onChange={(checked) => update(row._key, column.key, checked)} />
      : <Input variant="borderless" value={value ?? ""} readOnly={!editable} onChange={(event) => update(row._key, column.key, event.target.value)} />,
  }));
  if (editable) columns.push({ title: "操作", dataIndex: "_actions", key: "_actions", width: 70,
    render: (_: any, row: Record<string, any>) => <Popconfirm title="删除这条映射？" onConfirm={() => setRows((current) => current.filter((item) => item._key !== row._key))}><Button danger type="text" icon={<DeleteOutlined />} /></Popconfirm> } as any);

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/mapping-admin/${type}`, rows.map(({ id, _key, ...row }) => row));
      message.success("在线映射已保存");
      await load();
    } catch (error: any) { message.error(error?.response?.data?.detail || "保存失败"); }
    finally { setSaving(false); }
  };

  const metadata = payload?.metadata;
  return <div className="mapping-editor">
    <div className="mapping-status-bar">
      <div><strong>当前启用版本</strong><span>{metadata?.row_count || 0} 条记录</span>
        <span>{metadata?.source_type === "upload" ? `上传文件：${metadata.source_filename}` : metadata?.source_type === "online" ? "在线编辑版本" : "尚无版本信息"}</span>
        {metadata?.updated_at ? <span>更新于 {new Date(metadata.updated_at).toLocaleString()} · {metadata.updated_by || "系统"}</span> : null}</div>
      <Space wrap>
        <Button icon={<DownloadOutlined />} href={`/api/mapping-admin/${type}/download`}>下载当前表</Button>
        {editable ? <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={async (file) => {
          const form = new FormData(); form.append("file", file);
          try { await apiClient.post(`/mapping-admin/${type}/upload`, form); message.success("映射表已全量更新"); await load(); } catch (error: any) { message.error(error?.response?.data?.detail || "上传失败"); }
          return false;
        }}><Button icon={<UploadOutlined />}>上传全量表</Button></Upload> : null}
        {editable ? <Button icon={<PlusOutlined />} onClick={() => setRows((current) => [...current, { _key: crypto.randomUUID(), is_active: true }])}>新增一行</Button> : null}
        {editable ? <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存在线编辑</Button> : null}
      </Space>
    </div>
    {!editable ? <Tag color="blue" style={{ marginBottom: 12 }}>普通用户为只读模式</Tag> : null}
    <Table rowKey="_key" loading={loading} columns={columns as any} dataSource={rows} size="small" bordered sticky pagination={{ pageSize: 20, showSizeChanger: true }} scroll={{ x: "max-content", y: 560 }} />
  </div>;
}

export default function MappingPage() {
  return <Card className="mapping-page-card"><Tabs defaultActiveKey="store" size="large" items={(Object.keys(LABELS) as MappingType[]).map((type) => ({ key: type, label: LABELS[type], children: <MappingEditor type={type} /> }))} /></Card>;
}
