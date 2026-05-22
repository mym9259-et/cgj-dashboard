import { Button, Dropdown, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useFilterStore } from "../../stores/filterStore";
import { exportData, downloadBlob } from "../../api/export";

export default function ExportButton() {
  const { filters, filterLogic, startDate, endDate } = useFilterStore();

  const handleExport = async (format: "excel" | "csv") => {
    try {
      const blob = await exportData(format, filters, filterLogic, startDate, endDate);
      const ext = format === "excel" ? "xlsx" : "csv";
      downloadBlob(blob, `导出数据_${new Date().toISOString().slice(0, 10)}.${ext}`);
      message.success("导出成功");
    } catch (e: any) {
      message.error("导出失败: " + (e?.response?.data?.message || e.message));
    }
  };

  const items = [
    { key: "excel", label: "导出 Excel", onClick: () => handleExport("excel") },
    { key: "csv", label: "导出 CSV", onClick: () => handleExport("csv") },
  ];

  return (
    <Dropdown menu={{ items }}>
      <Button icon={<DownloadOutlined />}>导出</Button>
    </Dropdown>
  );
}
