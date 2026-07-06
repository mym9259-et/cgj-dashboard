import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button, Card, Empty, Spin, Table, Tag, Tooltip, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { getStoreOverview } from "../api/storeAnalysis";
import { useDebounce } from "../hooks/useDebounce";
import { useFilterStore } from "../stores/filterStore";
import type { StoreDailyTrend, StoreOverviewData, StoreOverviewItem } from "../types/storeAnalysis";
import { formatCurrency, formatPercent } from "../utils/formatters";

const SERIES_COLUMNS = [
  { key: "a_series", label: "A系" },
  { key: "b_series", label: "B系" },
  { key: "c_series", label: "C系" },
  { key: "d_series", label: "D系" },
  { key: "lafa_series", label: "Lafa" },
] as const;

type TrendKey = "delivery_penetration" | "contact_rate" | "contact_penetration";

function Sparkline({ rows, metric }: { rows: StoreDailyTrend[]; metric: TrendKey }) {
  const values = rows.map((row) => row[metric]);
  if (values.length < 2) return <span className="sparkline-empty">--</span>;
  const width = 112;
  const height = 34;
  const max = Math.max(...values, 0.01);
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 2 - (value / max) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return <Tooltip title={`${rows[0].day} 至 ${rows[rows.length - 1].day}`}>
    <svg className="store-sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="指标趋势">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  </Tooltip>;
}

function dimensionFilters(items: StoreOverviewItem[], key: keyof StoreOverviewItem) {
  return [...new Set(items.map((item) => String(item[key] || "未映射")))].sort((a, b) => a.localeCompare(b, "zh-CN"))
    .map((value) => ({ text: value, value }));
}

function ScaleValue({ value, max, currency = false }: { value: number; max: number; currency?: boolean }) {
  const strength = max > 0 ? value / max : 0;
  return <span className="heat-value" style={{ background: `rgba(22, 119, 255, ${0.06 + strength * 0.30})` }}>
    {currency ? formatCurrency(value) : value.toLocaleString()}
  </span>;
}

function HeatValue({ value, benchmark, palette = "green-red", currency = false }: { value: number; benchmark: number; palette?: "green-red" | "blue-red"; currency?: boolean }) {
  const delta = value - benchmark;
  const scale = currency ? Math.max(Math.abs(benchmark) * 0.35, 1) : 0.15;
  const strength = Math.min(Math.abs(delta) / scale, 1);
  const background = delta === 0 ? "transparent" : delta > 0
    ? palette === "blue-red" ? `rgba(22, 119, 255, ${0.10 + strength * 0.30})` : `rgba(82, 196, 26, ${0.10 + strength * 0.28})`
    : `rgba(255, 77, 79, ${0.10 + strength * 0.28})`;
  return <span className="heat-value" style={{ background }}>{currency ? formatCurrency(value) : formatPercent(value, 1)}</span>;
}

export default function StoreOverviewPage() {
  const navigate = useNavigate();
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const debouncedFilters = useDebounce(filters, 300);
  const debouncedLogic = useDebounce(filterLogic, 300);
  const debouncedStart = useDebounce(startDate, 300);
  const debouncedEnd = useDebounce(endDate, 300);
  const cacheKey = useMemo(() => `cgj-page-store-overview-v1:${JSON.stringify({
    filters: debouncedFilters,
    filterLogic: debouncedLogic,
    startDate: debouncedStart,
    endDate: debouncedEnd,
  })}`, [debouncedFilters, debouncedLogic, debouncedStart, debouncedEnd]);
  const [data, setData] = useState<StoreOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { setData(JSON.parse(cached)); } catch { sessionStorage.removeItem(cacheKey); }
    }
    setLoading(!cached);
    getStoreOverview(debouncedFilters, debouncedLogic, debouncedStart, debouncedEnd)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        }
      })
      .catch(() => { if (!cancelled) message.error("门店总览数据加载失败"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cacheKey, debouncedFilters, debouncedLogic, debouncedStart, debouncedEnd]);

  const detailQuery = (extra: Record<string, string>) => {
    const params = new URLSearchParams(extra);
    if (debouncedStart) params.set("start_date", debouncedStart);
    if (debouncedEnd) params.set("end_date", debouncedEnd);
    return params.toString();
  };

  const columns = useMemo<ColumnsType<StoreOverviewItem>>(() => {
    const items = data?.items || [];
    const summary = data?.summary;
    const maxima = {
      deliveries: Math.max(0, ...items.map((item) => item.deliveries)),
      contacted: Math.max(0, ...items.map((item) => item.contacted)),
      deals: Math.max(0, ...items.map((item) => item.deals)),
      total_revenue: Math.max(0, ...items.map((item) => item.total_revenue)),
    };
    const mappedColumn = (title: string, key: keyof StoreOverviewItem, width: number) => ({
      title,
      dataIndex: key,
      key: String(key),
      width,
      filters: dimensionFilters(items, key),
      filterSearch: true,
      onFilter: (value: boolean | React.Key, record: StoreOverviewItem) => String(record[key] || "未映射") === String(value),
      sorter: (a: StoreOverviewItem, b: StoreOverviewItem) => String(a[key] || "").localeCompare(String(b[key] || ""), "zh-CN"),
      render: (value: unknown) => String(value || "--"),
    });
    return [
      { title: "门店名称", dataIndex: "store_name", key: "store_name", fixed: "left", width: 190,
        sorter: (a, b) => a.store_name.localeCompare(b.store_name, "zh-CN"),
        render: (name: string) => <Button type="link" size="small" onClick={() => navigate(`/store-analysis?${detailQuery({ store: name })}`)}>{name}</Button> },
      mappedColumn("门店总经理", "store_manager", 120),
      mappedColumn("大区", "region", 110),
      mappedColumn("省份", "province", 90),
      mappedColumn("市", "city", 90),
      mappedColumn("经销商/直营", "dealer_direct", 120),
      mappedColumn("模式", "store_mode", 100),
      { title: "销售员人数", dataIndex: "salesperson_count", key: "salesperson_count", width: 104, align: "right",
        sorter: (a, b) => a.salesperson_count - b.salesperson_count },
      { title: "销售员姓名", dataIndex: "salespeople", key: "salespeople", width: 230,
        render: (names: string[]) => <div className="store-people-cell">{names.map((name) => <Tag key={name} className="clickable-tag" onClick={() => navigate(`/people-analysis/individual?${detailQuery({ name })}`)}>{name}</Tag>)}</div> },
      { title: "首次录客日期", dataIndex: "first_record_date", key: "first_record_date", width: 112, sorter: (a, b) => (a.first_record_date || "").localeCompare(b.first_record_date || "") },
      { title: "末次录客日期", dataIndex: "last_record_date", key: "last_record_date", width: 112, sorter: (a, b) => (a.last_record_date || "").localeCompare(b.last_record_date || "") },
      { title: "交付数", dataIndex: "deliveries", key: "deliveries", width: 82, align: "right", sorter: (a, b) => a.deliveries - b.deliveries, render: (value: number) => <ScaleValue value={value} max={maxima.deliveries} /> },
      { title: "触客数", dataIndex: "contacted", key: "contacted", width: 82, align: "right", sorter: (a, b) => a.contacted - b.contacted, render: (value: number) => <ScaleValue value={value} max={maxima.contacted} /> },
      { title: "成交数", dataIndex: "deals", key: "deals", width: 82, align: "right", sorter: (a, b) => a.deals - b.deals, render: (value: number) => <ScaleValue value={value} max={maxima.deals} /> },
      { title: "销售额", dataIndex: "total_revenue", key: "total_revenue", width: 112, align: "right", sorter: (a, b) => a.total_revenue - b.total_revenue, render: (value: number) => <ScaleValue value={value} max={maxima.total_revenue} currency /> },
      { title: "交付渗透率", dataIndex: "delivery_penetration", key: "delivery_penetration", width: 108, align: "right", sorter: (a, b) => a.delivery_penetration - b.delivery_penetration, render: (value: number) => <HeatValue value={value} benchmark={summary?.delivery_penetration || 0} /> },
      { title: "交付渗透趋势", key: "delivery_penetration_trend", width: 126, render: (_, record) => <Sparkline rows={record.trend} metric="delivery_penetration" /> },
      { title: "触客率", dataIndex: "contact_rate", key: "contact_rate", width: 88, align: "right", sorter: (a, b) => a.contact_rate - b.contact_rate, render: (value: number) => <HeatValue value={value} benchmark={summary?.contact_rate || 0} /> },
      { title: "触客率趋势", key: "contact_rate_trend", width: 126, render: (_, record) => <Sparkline rows={record.trend} metric="contact_rate" /> },
      { title: "触客渗透率", dataIndex: "contact_penetration", key: "contact_penetration", width: 108, align: "right", sorter: (a, b) => a.contact_penetration - b.contact_penetration, render: (value: number) => <HeatValue value={value} benchmark={summary?.contact_penetration || 0} /> },
      { title: "触客渗透趋势", key: "contact_penetration_trend", width: 126, render: (_, record) => <Sparkline rows={record.trend} metric="contact_penetration" /> },
      { title: "客单价", dataIndex: "avg_deal_amount", key: "avg_deal_amount", width: 108, align: "right", sorter: (a, b) => a.avg_deal_amount - b.avg_deal_amount, render: (value: number) => <HeatValue value={value} benchmark={summary?.avg_deal_amount || 0} currency /> },
      { title: "无忧5年期占比", dataIndex: "wuyou_five_year_ratio", key: "wuyou_five_year_ratio", width: 126, align: "right", sorter: (a, b) => a.wuyou_five_year_ratio - b.wuyou_five_year_ratio, render: (value: number) => <HeatValue value={value} benchmark={summary?.wuyou_five_year_ratio || 0} /> },
      ...SERIES_COLUMNS.map((series) => ({ title: series.label, children: [
        { title: "触客贡献", key: `${series.key}-share`, width: 96, align: "right" as const, sorter: (a: StoreOverviewItem, b: StoreOverviewItem) => a[series.key].contact_share - b[series.key].contact_share, render: (_: unknown, record: StoreOverviewItem) => <HeatValue value={record[series.key].contact_share} benchmark={summary?.[series.key].contact_share || 0} palette="blue-red" /> },
        { title: "触客渗透率", key: `${series.key}-penetration`, width: 108, align: "right" as const, sorter: (a: StoreOverviewItem, b: StoreOverviewItem) => a[series.key].contact_penetration - b[series.key].contact_penetration, render: (_: unknown, record: StoreOverviewItem) => <HeatValue value={record[series.key].contact_penetration} benchmark={summary?.[series.key].contact_penetration || 0} /> },
      ] })),
    ];
  }, [data, debouncedStart, debouncedEnd, navigate]);

  const summaryCells = (summary: StoreOverviewItem): ReactNode[] => columns.flatMap((column) => "children" in column && column.children ? column.children : [column]).map((column) => {
    const key = String(column.key || "");
    if (key === "store_name") return summary.store_name;
    if (key === "salesperson_count") return `${summary.salesperson_count} 人`;
    if (key === "deliveries") return summary.deliveries.toLocaleString();
    if (key === "contacted") return summary.contacted.toLocaleString();
    if (key === "deals") return summary.deals.toLocaleString();
    if (key === "total_revenue") return formatCurrency(summary.total_revenue);
    if (["delivery_penetration", "contact_rate", "contact_penetration", "wuyou_five_year_ratio"].includes(key)) return formatPercent(summary[key as TrendKey | "wuyou_five_year_ratio"] as number, 1);
    if (key === "avg_deal_amount") return formatCurrency(summary.avg_deal_amount);
    for (const series of SERIES_COLUMNS) {
      if (key === `${series.key}-share`) return formatPercent(summary[series.key].contact_share, 1);
      if (key === `${series.key}-penetration`) return formatPercent(summary[series.key].contact_penetration, 1);
    }
    return "";
  });

  return <div className="store-overview-page">
    <div className="page-heading"><h1>门店总览</h1><span>共 {data?.items.length || 0} 家门店</span></div>
    <Card>
      {loading && !data ? <Spin size="large" style={{ display: "block", margin: "80px auto" }} />
        : data?.items.length ? <Table rowKey="store_name" size="small" bordered sticky columns={columns} dataSource={data.items}
          pagination={{ pageSize: 20, showSizeChanger: true }} scroll={{ x: "max-content" }}
          summary={() => data ? <Table.Summary fixed="top"><Table.Summary.Row className="store-summary-row">
            {summaryCells(data.summary).map((value, index) => <Table.Summary.Cell key={index} index={index}>{value}</Table.Summary.Cell>)}
          </Table.Summary.Row></Table.Summary> : null} />
        : <Empty description="当前筛选范围内暂无门店数据" />}
    </Card>
  </div>;
}
