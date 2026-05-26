import { useState } from "react";
import { Modal, Table, Select, Input, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import apiClient from "../../api/client";

interface UnmatchedStore {
  name: string;
  lingpao_region?: string;
  province?: string;
  city?: string;
  is_lingpao?: string;
  store_manager?: string;
}

export default function MappingFixModal({
  open,
  stores,
  onClose,
}: {
  open: boolean;
  stores: string[];
  onClose: () => void;
}) {
  const [data, setData] = useState<UnmatchedStore[]>(
    stores.map((s) => ({ name: s }))
  );
  const [saving, setSaving] = useState(false);

  const updateRow = (index: number, field: string, value: string) => {
    setData((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const batchApply = (field: string, value: string) => {
    setData((prev) => prev.map((r) => ({ ...r, [field]: value })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = data.map((d) => ({
        merchant_name: d.name,
        lingpao_region: d.lingpao_region || undefined,
        province: d.province || undefined,
        city: d.city || undefined,
        is_lingpao: d.is_lingpao || undefined,
        store_manager: d.store_manager || undefined,
      }));
      await apiClient.post("/store/mapping/manual", items);
      message.success(`已更新 ${items.length} 条映射`);
      onClose();
    } catch (e: any) {
      message.error("保存失败: " + (e?.response?.data?.detail || e.message));
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<UnmatchedStore> = [
    { title: "商户名称", dataIndex: "name", key: "name", width: 200, fixed: "left" },
    {
      title: "零跑大区", dataIndex: "lingpao_region", key: "region", width: 130,
      render: (_: any, __: any, i: number) => (
        <Select size="small" style={{ width: 110 }} value={data[i]?.lingpao_region || undefined}
          onChange={(v) => updateRow(i, "lingpao_region", v)} placeholder="选大区" allowClear
          options={["东南大区", "中南大区", "华西大区"].map((v) => ({ label: v, value: v }))} />
      ),
    },
    {
      title: "省", dataIndex: "province", key: "province", width: 110,
      render: (_: any, __: any, i: number) => (
        <Input size="small" value={data[i]?.province || ""} onChange={(e) => updateRow(i, "province", e.target.value)} placeholder="省" />
      ),
    },
    {
      title: "市", dataIndex: "city", key: "city", width: 110,
      render: (_: any, __: any, i: number) => (
        <Input size="small" value={data[i]?.city || ""} onChange={(e) => updateRow(i, "city", e.target.value)} placeholder="市" />
      ),
    },
    {
      title: "是否零跑", dataIndex: "is_lingpao", key: "is_lp", width: 100,
      render: (_: any, __: any, i: number) => (
        <Select size="small" style={{ width: 80 }} value={data[i]?.is_lingpao || undefined}
          onChange={(v) => updateRow(i, "is_lingpao", v)} placeholder="选" allowClear
          options={["是", "否"].map((v) => ({ label: v, value: v }))} />
      ),
    },
    {
      title: "门店总经理", dataIndex: "store_manager", key: "mgr", width: 130,
      render: (_: any, __: any, i: number) => (
        <Input size="small" value={data[i]?.store_manager || ""} onChange={(e) => updateRow(i, "store_manager", e.target.value)} placeholder="总经理" />
      ),
    },
  ];

  return (
    <Modal title="补充门店映射信息" open={open} onCancel={onClose} onOk={handleSave}
      confirmLoading={saving} width={950} okText="确认保存" cancelText="取消">
      <div style={{ marginBottom: 12, color: "#8c8c8c", fontSize: 13 }}>
        共 {data.length} 个门店未在映射表中。请逐行或批量设置大区/省/市/是否零跑/总经理信息。
      </div>
      <div style={{ marginBottom: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#8c8c8c", lineHeight: "24px" }}>批量设置:</span>
        <Select size="small" style={{ width: 110 }} placeholder="大区" allowClear onChange={(v) => batchApply("lingpao_region", v)}
          options={["东南大区", "中南大区", "华西大区"].map((v) => ({ label: v, value: v }))} />
        <Select size="small" style={{ width: 80 }} placeholder="是否零跑" allowClear onChange={(v) => batchApply("is_lingpao", v)}
          options={["是", "否"].map((v) => ({ label: v, value: v }))} />
        <Input size="small" style={{ width: 120 }} placeholder="批设省" onPressEnter={(e: any) => batchApply("province", e.target.value)} />
        <Input size="small" style={{ width: 120 }} placeholder="批设市" onPressEnter={(e: any) => batchApply("city", e.target.value)} />
      </div>
      <Table dataSource={data} columns={columns} rowKey="name" size="small" scroll={{ x: 800, y: 400 }} pagination={false} />
    </Modal>
  );
}
