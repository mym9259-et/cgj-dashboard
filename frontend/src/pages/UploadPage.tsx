import { useState, useEffect } from "react";
import {
  Card,
  Upload,
  Button,
  Table,
  Select,
  Tag,
  Progress,
  message,
  Space,
  Modal,
  Input,
  Alert,
  Steps,
  Result,
} from "antd";
import { InboxOutlined, CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useUploadStore } from "../stores/uploadStore";
import {
  previewFile,
  uploadChunk,
  importData,
  listMappings,
  saveMapping,
} from "../api/upload";
import { FIELD_LABELS } from "../utils/fieldLabels";
import { v4 as uuidv4 } from "../utils/uuid";

const { Dragger } = Upload;

export default function UploadPage() {
  const store = useUploadStore();
  const [savedMappings, setSavedMappings] = useState<any[]>([]);
  const [showSaveMapping, setShowSaveMapping] = useState(false);
  const [mappingName, setMappingName] = useState("");
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    listMappings().then(setSavedMappings).catch(() => {});
  }, []);

  const handleFileSelect = async (file: File) => {
    store.setFile(file);
    try {
      const preview = await previewFile(file);
      store.setPreview(preview);
    } catch (e: any) {
      message.error("文件预览失败: " + (e.response?.data?.message || e.message));
      store.setError(e.message);
    }
  };

  const handleUploadAndImport = async () => {
    if (!store.file) return;
    store.setStep("uploading");
    setImportResult(null);  // Clear previous result before starting

    const chunkSize = 1024 * 1024; // 1MB
    const totalChunks = Math.ceil(store.file.size / chunkSize);
    const uploadId = uuidv4();
    store.setUploadId(uploadId);

    try {
      // Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, store.file.size);
        const chunk = store.file.slice(start, end);
        await uploadChunk(uploadId, i, totalChunks, store.file.name, chunk);
        store.setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      // Import
      store.setStep("importing");
      const result = await importData(uploadId, store.mapping);
      setImportResult(result);
      store.setStep("done");
      message.success(
        `导入完成：${result.valid_rows} 条有效数据，${result.error_rows} 条错误`
      );
    } catch (e: any) {
      const detail = e.response?.data?.detail || e.response?.data?.message || e.message;
      console.error("Import error:", e.response?.data || e);
      message.error("导入失败: " + detail);
      setImportResult({ total_rows: 0, valid_rows: 0, error_rows: 0, errors: [{ row: 0, errors: [detail] }] });
      store.setStep("done");
    }
  };

  const handleSaveMapping = async () => {
    if (!mappingName.trim()) return;
    try {
      await saveMapping(mappingName.trim(), store.mapping);
      message.success("映射配置已保存");
      setShowSaveMapping(false);
      const mappings = await listMappings();
      setSavedMappings(mappings);
    } catch (e: any) {
      message.error("保存失败");
    }
  };

  const loadMapping = (mappingJson: Record<string, string>) => {
    store.setMapping(mappingJson);
    message.success("已加载映射配置");
  };

  // Mapping table columns
  const mappingColumns: ColumnsType<{
    header: string;
    sample: string;
    mappedField: string;
  }> = [
    {
      title: "Excel 列名",
      dataIndex: "header",
      key: "header",
      width: 200,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: "示例数据",
      dataIndex: "sample",
      key: "sample",
      ellipsis: true,
    },
    {
      title: "映射到系统字段",
      dataIndex: "mappedField",
      key: "mappedField",
      width: 280,
      render: (_: string, record: any) => {
        const isMapped = record.mappedField && record.mappedField !== "__skip__";
        const isDuplicate =
          isMapped &&
          Object.values(store.mapping).filter((v) => v === record.mappedField)
            .length > 1;

        return (
          <Space>
            <Select
              style={{ width: 220 }}
              value={record.mappedField || "__skip__"}
              onChange={(val) => {
                if (val === "__skip__") {
                  const newMapping = { ...store.mapping };
                  delete newMapping[record.header];
                  store.setMapping(newMapping);
                } else {
                  store.updateMapping(record.header, val);
                }
              }}
              status={isDuplicate ? "error" : undefined}
              showSearch
              options={[
                { label: "-- 不导入 --", value: "__skip__" },
                ...Object.entries(FIELD_LABELS)
                  .filter(([k]) => k !== "extra_fields")
                  .map(([key, label]) => ({
                    label: `${label} (${key})`,
                    value: key,
                  })),
              ]}
            />
            {isMapped && <CheckCircleOutlined style={{ color: "#52c41a" }} />}
            {isDuplicate && (
              <Tag color="error">重复</Tag>
            )}
          </Space>
        );
      },
    },
  ];

  const mappingData =
    store.preview?.columns.map((col) => ({
      key: col.header,
      header: col.header,
      sample: col.sample_values?.slice(0, 3).join(", ") || "",
      mappedField: store.mapping[col.header] || "",
    })) || [];

  const mappedCount = Object.values(store.mapping).filter(
    (v) => v && v !== "__skip__"
  ).length;
  const totalCols = store.preview?.columns.length || 0;

  // Done state
  if (store.step === "done" && importResult) {
    return (
      <Card>
        <Result
          status={importResult.error_rows > 0 ? "warning" : "success"}
          title="数据导入完成"
          subTitle={`共 ${importResult.total_rows} 条，有效 ${importResult.valid_rows} 条，错误 ${importResult.error_rows} 条`}
          extra={[
            <Button
              key="new"
              type="primary"
              onClick={() => {
                store.reset();
                setImportResult(null);
              }}
            >
              重新上传
            </Button>,
            <Button key="dashboard" onClick={() => (window.location.href = "/dashboard")}>
              前往看板
            </Button>,
          ]}
        />
        {importResult.errors?.length > 0 && (
          <Table
            style={{ marginTop: 16 }}
            dataSource={importResult.errors}
            columns={[
              { title: "行号", dataIndex: "row", key: "row" },
              {
                title: "错误",
                dataIndex: "errors",
                key: "errors",
                render: (v: string[]) => v?.join(", "),
              },
            ]}
            size="small"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
    );
  }

  // Error state
  if (store.step === "error") {
    return (
      <Card>
        <Result
          status="error"
          title="导入失败"
          subTitle={store.error}
          extra={
            <Button type="primary" onClick={store.reset}>
              重试
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <Steps
        current={
          store.step === "idle" || store.step === "previewing"
            ? 0
            : store.step === "mapping"
            ? 1
            : store.step === "uploading" || store.step === "importing"
            ? 2
            : 3
        }
        style={{ marginBottom: 24 }}
        items={[
          { title: "选择文件" },
          { title: "字段映射" },
          { title: "上传导入" },
          { title: "完成" },
        ]}
      />

      {/* Step 1: File Selection */}
      {store.step === "idle" && (
        <Card title="选择 Excel 文件">
          <Dragger
            accept=".xlsx,.xls"
            maxCount={1}
            beforeUpload={(file) => {
              handleFileSelect(file);
              return false;
            }}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 .xlsx / .xls 格式，最大 200MB
            </p>
          </Dragger>
        </Card>
      )}

      {store.step === "previewing" && (
        <Card>
          <div style={{ textAlign: "center", padding: 40 }}>
            正在解析文件...
          </div>
        </Card>
      )}

      {/* Step 2: Field Mapping */}
      {store.step === "mapping" && store.preview && (
        <>
          <Card
            title={`字段映射 (${mappedCount}/${totalCols} 列已映射)`}
            extra={
              <Space>
                {savedMappings.length > 0 && (
                  <Select
                    style={{ width: 200 }}
                    placeholder="加载已保存的映射"
                    onChange={(id) => {
                      const m = savedMappings.find((m) => m.id === id);
                      if (m) loadMapping(m.mapping_json);
                    }}
                    options={savedMappings.map((m) => ({
                      label: m.name,
                      value: m.id,
                    }))}
                    allowClear
                  />
                )}
                <Button onClick={() => setShowSaveMapping(true)}>
                  保存当前映射
                </Button>
                <Button
                  type="primary"
                  onClick={handleUploadAndImport}
                  disabled={mappedCount === 0}
                >
                  开始导入
                </Button>
              </Space>
            }
          >
            {store.preview.detected_issues?.length > 0 && (
              <Alert
                type="warning"
                message={store.preview.detected_issues.join("; ")}
                style={{ marginBottom: 16 }}
                icon={<WarningOutlined />}
              />
            )}
            <Table
              columns={mappingColumns}
              dataSource={mappingData}
              pagination={false}
              scroll={{ y: 500 }}
              size="small"
            />
            <div style={{ marginTop: 12, color: "#8c8c8c" }}>
              文件共 {store.preview.total_rows?.toLocaleString()} 行数据
            </div>
          </Card>

          <Modal
            title="保存映射配置"
            open={showSaveMapping}
            onOk={handleSaveMapping}
            onCancel={() => setShowSaveMapping(false)}
          >
            <Input
              placeholder="输入映射配置名称"
              value={mappingName}
              onChange={(e) => setMappingName(e.target.value)}
            />
          </Modal>
        </>
      )}

      {/* Step 3: Uploading */}
      {(store.step === "uploading" || store.step === "importing") && (
        <Card
          title={store.step === "uploading" ? "上传文件中..." : "导入数据中..."}
        >
          <Progress
            percent={store.progress}
            status={store.step === "importing" ? "active" : undefined}
          />
          <p style={{ marginTop: 12, color: "#8c8c8c" }}>
            {store.step === "uploading"
              ? "正在分片上传文件..."
              : "正在解析并导入数据，请稍候..."}
          </p>
        </Card>
      )}
    </div>
  );
}
