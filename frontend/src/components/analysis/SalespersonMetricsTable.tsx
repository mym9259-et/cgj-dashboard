import type { ReactNode } from "react";
import { Button, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SalespersonStoreMetrics } from "../../types/storeAnalysis";
import { formatCurrency, formatPercent } from "../../utils/formatters";

const SERIES_COLUMNS = [
  { key: "a_series", label: "A系" },
  { key: "b_series", label: "B系" },
  { key: "c_series", label: "C系" },
  { key: "d_series", label: "D系" },
  { key: "lafa_series", label: "Lafa" },
] as const;

function HeatValue({ value, benchmark, format, palette = "green-red" }: { value: number; benchmark: number; format: "percent" | "currency"; palette?: "green-red" | "blue-red" }) {
  const delta = value - benchmark;
  const scale = format === "percent" ? 0.15 : Math.max(Math.abs(benchmark) * 0.35, 1);
  const strength = Math.min(Math.abs(delta) / scale, 1);
  const background = delta === 0 ? "transparent" : delta > 0
    ? palette === "blue-red" ? `rgba(22, 119, 255, ${0.10 + strength * 0.30})` : `rgba(82, 196, 26, ${0.10 + strength * 0.28})`
    : `rgba(255, 77, 79, ${0.10 + strength * 0.28})`;
  return <span className="heat-value" style={{ background }}>{format === "percent" ? formatPercent(value, 1) : formatCurrency(value)}</span>;
}

function ScaleValue({ value, max, currency = false }: { value: number; max: number; currency?: boolean }) {
  const strength = max > 0 ? value / max : 0;
  return <span className="heat-value" style={{ background: `rgba(22, 119, 255, ${0.06 + strength * 0.30})` }}>
    {currency ? formatCurrency(value) : value.toLocaleString()}
  </span>;
}

export function SalespersonMetricsTable({
  items,
  summary,
  showStores = false,
  showLastRecordDate = false,
  onPersonClick,
  onStoreClick,
}: {
  items: SalespersonStoreMetrics[];
  summary: SalespersonStoreMetrics;
  showStores?: boolean;
  showLastRecordDate?: boolean;
  onPersonClick?: (name: string) => void;
  onStoreClick?: (store: string) => void;
}) {
  const maxima = {
    deliveries: Math.max(0, ...items.map((item) => item.deliveries)),
    contacted: Math.max(0, ...items.map((item) => item.contacted)),
    deals: Math.max(0, ...items.map((item) => item.deals)),
    total_revenue: Math.max(0, ...items.map((item) => item.total_revenue)),
  };
  const columns: ColumnsType<SalespersonStoreMetrics> = [
    { title: "销售员", dataIndex: "salesperson", key: "salesperson", fixed: "left", width: 120,
      sorter: (a, b) => a.salesperson.localeCompare(b.salesperson, "zh-CN"),
      render: (name: string) => onPersonClick ? <Button type="link" size="small" onClick={() => onPersonClick(name)}>{name}</Button> : name },
    ...(showStores ? [{ title: "所在门店", dataIndex: "stores", key: "stores", width: 190,
      render: (stores: string[]) => <Tooltip title={stores.join("、")}><div className="store-tags-cell">{stores.slice(0, 2).map((store) => <Tag key={store} className={onStoreClick ? "clickable-tag" : undefined} onClick={() => onStoreClick?.(store)}>{store}</Tag>)}{stores.length > 2 ? `+${stores.length - 2}` : ""}</div></Tooltip>,
      sorter: (a: SalespersonStoreMetrics, b: SalespersonStoreMetrics) => a.stores.join().localeCompare(b.stores.join(), "zh-CN") }] : []),
    { title: "首次录客日期", dataIndex: "first_record_date", key: "first_record_date", width: 112,
      sorter: (a, b) => (a.first_record_date || "").localeCompare(b.first_record_date || "") },
    ...(showLastRecordDate ? [{ title: "末次录客日期", dataIndex: "last_record_date", key: "last_record_date", width: 112,
      sorter: (a: SalespersonStoreMetrics, b: SalespersonStoreMetrics) => (a.last_record_date || "").localeCompare(b.last_record_date || "") }] : []),
    { title: "交付数", dataIndex: "deliveries", key: "deliveries", width: 88, align: "right", sorter: (a, b) => a.deliveries - b.deliveries,
      render: (value) => <ScaleValue value={value} max={maxima.deliveries} /> },
    { title: "触客数", dataIndex: "contacted", key: "contacted", width: 88, align: "right", sorter: (a, b) => a.contacted - b.contacted,
      render: (value) => <ScaleValue value={value} max={maxima.contacted} /> },
    { title: "成交数", dataIndex: "deals", key: "deals", width: 88, align: "right", sorter: (a, b) => a.deals - b.deals,
      render: (value) => <ScaleValue value={value} max={maxima.deals} /> },
    { title: "销售额", dataIndex: "total_revenue", key: "total_revenue", width: 112, align: "right", sorter: (a, b) => a.total_revenue - b.total_revenue,
      render: (value) => <ScaleValue value={value} max={maxima.total_revenue} currency /> },
    { title: "触客渗透率", dataIndex: "contact_penetration", key: "contact_penetration", width: 112, align: "right", sorter: (a, b) => a.contact_penetration - b.contact_penetration,
      render: (value) => <HeatValue value={value} benchmark={summary.contact_penetration} format="percent" /> },
    { title: "客单价", dataIndex: "avg_deal_amount", key: "avg_deal_amount", width: 108, align: "right", sorter: (a, b) => a.avg_deal_amount - b.avg_deal_amount,
      render: (value) => <HeatValue value={value} benchmark={summary.avg_deal_amount} format="currency" /> },
    { title: "无忧5年期占比", dataIndex: "wuyou_five_year_ratio", key: "wuyou_five_year_ratio", width: 122, align: "right", sorter: (a, b) => a.wuyou_five_year_ratio - b.wuyou_five_year_ratio,
      render: (value) => <HeatValue value={value} benchmark={summary.wuyou_five_year_ratio} format="percent" /> },
    ...SERIES_COLUMNS.map((series) => ({ title: series.label, children: [
      { title: "触客贡献", key: `${series.key}-share`, width: 96, align: "right" as const,
        sorter: (a: SalespersonStoreMetrics, b: SalespersonStoreMetrics) => a[series.key].contact_share - b[series.key].contact_share,
        render: (_: unknown, record: SalespersonStoreMetrics) => <HeatValue value={record[series.key].contact_share} benchmark={summary[series.key].contact_share} format="percent" palette="blue-red" /> },
      { title: "触客渗透率", key: `${series.key}-penetration`, width: 108, align: "right" as const,
        sorter: (a: SalespersonStoreMetrics, b: SalespersonStoreMetrics) => a[series.key].contact_penetration - b[series.key].contact_penetration,
        render: (_: unknown, record: SalespersonStoreMetrics) => <HeatValue value={record[series.key].contact_penetration} benchmark={summary[series.key].contact_penetration} format="percent" /> },
    ] })),
  ];

  return <Table rowKey="salesperson" size="small" bordered sticky columns={columns} dataSource={items}
    pagination={{ pageSize: 20, showSizeChanger: true }} scroll={{ x: "max-content" }}
    summary={() => <Table.Summary fixed="top"><Table.Summary.Row className="store-summary-row">
      {columns.flatMap((column) => "children" in column && column.children ? column.children : [column]).map((column, index) => {
        const key = String(column.key || "");
        let value: ReactNode = index === 0 ? summary.salesperson : "";
        if (key === "stores") value = `${summary.stores.length} 家门店`;
        if (key === "deliveries") value = summary.deliveries.toLocaleString();
        if (key === "contacted") value = summary.contacted.toLocaleString();
        if (key === "deals") value = summary.deals.toLocaleString();
        if (key === "total_revenue") value = formatCurrency(summary.total_revenue);
        if (key === "contact_penetration") value = formatPercent(summary.contact_penetration, 1);
        if (key === "avg_deal_amount") value = formatCurrency(summary.avg_deal_amount);
        if (key === "wuyou_five_year_ratio") value = formatPercent(summary.wuyou_five_year_ratio, 1);
        for (const series of SERIES_COLUMNS) {
          if (key === `${series.key}-share`) value = formatPercent(summary[series.key].contact_share, 1);
          if (key === `${series.key}-penetration`) value = formatPercent(summary[series.key].contact_penetration, 1);
        }
        return <Table.Summary.Cell key={`${key}-${index}`} index={index}>{value}</Table.Summary.Cell>;
      })}
    </Table.Summary.Row></Table.Summary>} />;
}
