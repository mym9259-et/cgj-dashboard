import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Popover,
  Row,
  Select,
  Spin,
  Statistic,
} from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import { getOverview } from "../api/dashboard";
import { useDebounce } from "../hooks/useDebounce";
import { useFilterStore } from "../stores/filterStore";
import { CHART_COLORS } from "../utils/chartColors";
import { formatCurrency, formatPercent } from "../utils/formatters";
import type { DashboardOverview, TrendItem } from "../types/dashboard";

type MetricKey =
  | "leads" | "contacted" | "deals" | "revenue"
  | "delivery_penetration" | "contact_penetration" | "contact_rate"
  | "delivery_penetration_ma7" | "contact_penetration_ma7"
  | "a_series_ratio" | "a_series_ratio_ma20"
  | "a_series_contact_penetration" | "a_series_contact_penetration_ma7"
  | "b_series_ratio" | "b_series_ratio_ma20"
  | "b_series_contact_penetration" | "b_series_contact_penetration_ma7"
  | "c_series_ratio" | "c_series_ratio_ma20"
  | "c_series_contact_penetration" | "c_series_contact_penetration_ma7"
  | "d_series_ratio" | "d_series_ratio_ma20"
  | "d_series_contact_penetration" | "d_series_contact_penetration_ma7"
  | "lafa_series_ratio" | "lafa_series_ratio_ma20"
  | "lafa_series_contact_penetration" | "lafa_series_contact_penetration_ma7"
  | "wuyou_five_year_ratio";

const SCALE_OPTIONS: { label: string; value: MetricKey }[] = [
  { label: "交付数", value: "leads" },
  { label: "触客数", value: "contacted" },
  { label: "成交数", value: "deals" },
  { label: "销售额", value: "revenue" },
  { label: "交付渗透率", value: "delivery_penetration" },
  { label: "触客渗透率", value: "contact_penetration" },
  { label: "交付渗透率 MA7", value: "delivery_penetration_ma7" },
  { label: "触客渗透率 MA7", value: "contact_penetration_ma7" },
  { label: "触客率", value: "contact_rate" },
];

const METRIC_LABEL: Record<MetricKey, string> = {
  leads: "交付数",
  contacted: "触客数",
  deals: "成交数",
  revenue: "销售额",
  delivery_penetration: "交付渗透率",
  contact_penetration: "触客渗透率",
  delivery_penetration_ma7: "交付渗透率 MA7",
  contact_penetration_ma7: "触客渗透率 MA7",
  contact_rate: "触客率",
  a_series_ratio: "A系占比",
  a_series_ratio_ma20: "A系占比 MA20",
  a_series_contact_penetration: "A系触客渗透率",
  a_series_contact_penetration_ma7: "A系触客渗透率 MA7",
  b_series_ratio: "B系占比",
  b_series_ratio_ma20: "B系占比 MA20",
  b_series_contact_penetration: "B系触客渗透率",
  b_series_contact_penetration_ma7: "B系触客渗透率 MA7",
  c_series_ratio: "C系占比",
  c_series_ratio_ma20: "C系占比 MA20",
  c_series_contact_penetration: "C系触客渗透率",
  c_series_contact_penetration_ma7: "C系触客渗透率 MA7",
  d_series_ratio: "D系占比",
  d_series_ratio_ma20: "D系占比 MA20",
  d_series_contact_penetration: "D系触客渗透率",
  d_series_contact_penetration_ma7: "D系触客渗透率 MA7",
  lafa_series_ratio: "Lafa占比",
  lafa_series_ratio_ma20: "Lafa占比 MA20",
  lafa_series_contact_penetration: "Lafa触客渗透率",
  lafa_series_contact_penetration_ma7: "Lafa触客渗透率 MA7",
  wuyou_five_year_ratio: "无忧产品5年期占比",
};

const PERCENT_METRICS = new Set<MetricKey>([
  "delivery_penetration", "contact_penetration", "contact_rate",
  "delivery_penetration_ma7", "contact_penetration_ma7",
  "a_series_ratio", "a_series_ratio_ma20",
  "a_series_contact_penetration", "a_series_contact_penetration_ma7",
  "b_series_ratio", "b_series_ratio_ma20",
  "b_series_contact_penetration", "b_series_contact_penetration_ma7",
  "c_series_ratio", "c_series_ratio_ma20",
  "c_series_contact_penetration", "c_series_contact_penetration_ma7",
  "d_series_ratio", "d_series_ratio_ma20",
  "d_series_contact_penetration", "d_series_contact_penetration_ma7",
  "lafa_series_ratio", "lafa_series_ratio_ma20",
  "lafa_series_contact_penetration", "lafa_series_contact_penetration_ma7",
  "wuyou_five_year_ratio",
]);

const DEFAULT_SCALE_METRICS: MetricKey[] = [
  "leads", "deals", "delivery_penetration", "contact_penetration",
];

const DEFAULT_STRUCTURE_METRICS: MetricKey[] = [
  "a_series_ratio", "b_series_ratio", "c_series_ratio",
  "d_series_ratio", "lafa_series_ratio", "wuyou_five_year_ratio",
];

type MatrixColumn = "ratio" | "ratioMa20" | "penetration" | "penetrationMa7";
type MatrixRow = { label: string } & Partial<Record<MatrixColumn, MetricKey>>;

const MATRIX_COLUMNS: { key: MatrixColumn; label: string }[] = [
  { key: "ratio", label: "当日占比" },
  { key: "ratioMa20", label: "占比 MA20" },
  { key: "penetration", label: "触客渗透率" },
  { key: "penetrationMa7", label: "渗透率 MA7" },
];

const STRUCTURE_ROWS: MatrixRow[] = [
  { label: "A系", ratio: "a_series_ratio", ratioMa20: "a_series_ratio_ma20", penetration: "a_series_contact_penetration", penetrationMa7: "a_series_contact_penetration_ma7" },
  { label: "B系", ratio: "b_series_ratio", ratioMa20: "b_series_ratio_ma20", penetration: "b_series_contact_penetration", penetrationMa7: "b_series_contact_penetration_ma7" },
  { label: "C系", ratio: "c_series_ratio", ratioMa20: "c_series_ratio_ma20", penetration: "c_series_contact_penetration", penetrationMa7: "c_series_contact_penetration_ma7" },
  { label: "D系", ratio: "d_series_ratio", ratioMa20: "d_series_ratio_ma20", penetration: "d_series_contact_penetration", penetrationMa7: "d_series_contact_penetration_ma7" },
  { label: "Lafa", ratio: "lafa_series_ratio", ratioMa20: "lafa_series_ratio_ma20", penetration: "lafa_series_contact_penetration", penetrationMa7: "lafa_series_contact_penetration_ma7" },
  { label: "无忧5年期", ratio: "wuyou_five_year_ratio" },
];

function buildTrendOption(selected: MetricKey[], trend: TrendItem[]) {
  const hasPercent = selected.some((metric) => PERCENT_METRICS.has(metric));
  const hasCount = selected.some((metric) => !PERCENT_METRICS.has(metric) && metric !== "revenue");
  const hasRevenue = selected.includes("revenue");
  const yAxis: any[] = [];

  if (hasCount || hasRevenue) {
    yAxis.push({
      type: "value",
      name: "数量/金额",
      axisLabel: { formatter: (value: number) => hasRevenue ? `${(value / 10000).toFixed(0)}w` : value.toString() },
    });
  }
  if (hasPercent) {
    yAxis.push({ type: "value", name: "比率", axisLabel: { formatter: (value: number) => `${(value * 100).toFixed(0)}%` } });
  }
  if (yAxis.length === 0) yAxis.push({ type: "value" });

  return {
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params];
        let html = `<strong>${items[0]?.axisValue || ""}</strong><br/>`;
        for (const item of items) {
          const value = PERCENT_METRICS.has(item.seriesId as MetricKey)
            ? `${(item.value * 100).toFixed(2)}%`
            : item.value?.toLocaleString() ?? "-";
          html += `${item.marker} ${item.seriesName}: ${value}<br/>`;
        }
        return html;
      },
    },
    legend: { data: selected.map((metric) => METRIC_LABEL[metric]), bottom: 0, type: "scroll" as const },
    grid: { left: 60, right: 60, top: 20, bottom: 50, containLabel: true },
    xAxis: { type: "category", data: trend.map((item) => item.day), axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis,
    series: selected.map((metric, index) => {
      const isPercent = PERCENT_METRICS.has(metric);
      const isMovingAverage = metric.includes("_ma");
      return {
        id: metric,
        name: METRIC_LABEL[metric],
        type: "line",
        yAxisIndex: isPercent ? (yAxis.length > 1 ? 1 : 0) : 0,
        data: trend.map((item) => item[metric as keyof TrendItem]),
        smooth: isMovingAverage,
        showSymbol: false,
        itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] },
        lineStyle: { width: 2, type: isMovingAverage ? "dashed" as const : "solid" as const },
      };
    }),
  };
}

type SeriesRatioCardProps = {
  title: string;
  ratio: number;
  count: number;
  contactPenetration: number;
};

function SeriesRatioCard({ title, ratio, count, contactPenetration }: SeriesRatioCardProps) {
  const detailStyle = { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 } as const;
  return (
    <Card size="small" className="kpi-card" style={{ height: "100%" }}>
      <Statistic title={`${title}占比`} value={formatPercent(ratio, 1)} />
      <div style={{ ...detailStyle, marginTop: 6, color: "#8c8c8c" }}>
        <span>{title}交付数</span><strong style={{ color: "#595959" }}>{count.toLocaleString()}</strong>
      </div>
      <div style={{ ...detailStyle, marginTop: 3, color: "#8c8c8c" }}>
        <span>触客渗透率</span><strong style={{ color: "#1677ff" }}>{formatPercent(contactPenetration, 1)}</strong>
      </div>
    </Card>
  );
}

function StructureMetricSelector({ value, onChange }: { value: MetricKey[]; onChange: (value: MetricKey[]) => void }) {
  const toggle = (metric: MetricKey, checked: boolean) => {
    if (checked) onChange([...value, metric]);
    else if (value.length > 1) onChange(value.filter((item) => item !== metric));
  };

  const content = (
    <div style={{ maxWidth: "calc(100vw - 48px)", overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "92px repeat(4, 112px)", gap: "10px 12px", alignItems: "center", minWidth: 576, padding: 4 }}>
        <strong style={{ fontSize: 12, color: "#595959" }}>车系</strong>
        {MATRIX_COLUMNS.map((column) => <strong key={column.key} style={{ fontSize: 12, color: "#595959" }}>{column.label}</strong>)}
        {STRUCTURE_ROWS.flatMap((row) => [
          <span key={`${row.label}-label`} style={{ fontSize: 13 }}>{row.label}</span>,
          ...MATRIX_COLUMNS.map((column) => {
            const metric = row[column.key];
            return metric ? (
              <Checkbox key={`${row.label}-${column.key}`} checked={value.includes(metric)} disabled={value.length === 1 && value.includes(metric)} onChange={(event) => toggle(metric, event.target.checked)} />
            ) : <span key={`${row.label}-${column.key}`} style={{ color: "#bfbfbf" }}>-</span>;
          }),
        ])}
      </div>
    </div>
  );

  return (
    <Popover trigger="click" placement="bottomRight" content={content}>
      <Button size="small" icon={<AppstoreOutlined />}>结构指标 {value.length}</Button>
    </Popover>
  );
}

export default function DashboardPage() {
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const debouncedFilters = useDebounce(filters, 300);
  const debouncedLogic = useDebounce(filterLogic, 300);
  const debouncedStartDate = useDebounce(startDate, 300);
  const debouncedEndDate = useDebounce(endDate, 300);
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [scaleMetrics, setScaleMetrics] = useState<MetricKey[]>(DEFAULT_SCALE_METRICS);
  const [structureMetrics, setStructureMetrics] = useState<MetricKey[]>(DEFAULT_STRUCTURE_METRICS);

  useEffect(() => {
    setLoading(true);
    getOverview(debouncedFilters, debouncedLogic, debouncedStartDate, debouncedEndDate)
      .then(setData)
      .finally(() => setLoading(false));
  }, [debouncedFilters, debouncedLogic, debouncedStartDate, debouncedEndDate]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  if (!data) return <Empty description="暂无数据，请先上传数据文件" />;

  const { kpis, trend } = data;
  const penColor = (value: number, threshold: number) => value >= threshold ? "#52c41a" : "#faad14";

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 16 }}>
        <Card size="small" className="kpi-card"><Statistic title="总交付" value={kpis.total_leads} /></Card>
        <Card size="small" className="kpi-card"><Statistic title="触客数" value={kpis.contacted_count} /></Card>
        <Card size="small" className="kpi-card"><Statistic title="成交数" value={kpis.deal_count} valueStyle={{ color: "#52c41a" }} /></Card>
        <Card size="small" className="kpi-card"><Statistic title="销售额" value={Math.round(kpis.total_revenue).toLocaleString()} /></Card>
        <Card size="small" className="kpi-card"><Statistic title="无忧产品5年期占比" value={formatPercent(kpis.wuyou_five_year_ratio, 1)} /></Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 16, marginTop: 16 }}>
        <Card size="small" className="kpi-card"><Statistic title="触客率" value={formatPercent(kpis.contact_rate, 1)} /></Card>
        <Card size="small" className="kpi-card"><Statistic title="触客渗透率" value={formatPercent(kpis.contact_penetration, 1)} valueStyle={{ color: penColor(kpis.contact_penetration, 0.4) }} /></Card>
        <Card size="small" className="kpi-card"><Statistic title="交付渗透率" value={formatPercent(kpis.delivery_penetration, 1)} valueStyle={{ color: penColor(kpis.delivery_penetration, 0.3) }} /></Card>
        <Card size="small" className="kpi-card"><Statistic title="客单价" value={formatCurrency(kpis.avg_deal_amount)} /></Card>
        <Card size="small" className="kpi-card"><Statistic title="退单率" value={formatPercent(kpis.refund_rate, 2)} valueStyle={{ color: kpis.refund_rate > 0.02 ? "#ff4d4f" : "#52c41a" }} /></Card>
      </div>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} md={8} xl={4}><SeriesRatioCard title="A系" ratio={kpis.a_series_ratio} count={kpis.a_series_count} contactPenetration={kpis.a_series_contact_penetration} /></Col>
        <Col xs={24} sm={12} md={8} xl={4}><SeriesRatioCard title="B系" ratio={kpis.b_series_ratio} count={kpis.b_series_count} contactPenetration={kpis.b_series_contact_penetration} /></Col>
        <Col xs={24} sm={12} md={8} xl={4}><SeriesRatioCard title="C系" ratio={kpis.c_series_ratio} count={kpis.c_series_count} contactPenetration={kpis.c_series_contact_penetration} /></Col>
        <Col xs={24} sm={12} md={8} xl={4}><SeriesRatioCard title="D系" ratio={kpis.d_series_ratio} count={kpis.d_series_count} contactPenetration={kpis.d_series_contact_penetration} /></Col>
        <Col xs={24} sm={12} md={8} xl={4}><SeriesRatioCard title="Lafa" ratio={kpis.lafa_series_ratio} count={kpis.lafa_series_count} contactPenetration={kpis.lafa_series_contact_penetration} /></Col>
        <Col xs={24} sm={12} md={8} xl={4}><SeriesRatioCard title="其他" ratio={kpis.other_series_ratio} count={kpis.other_series_count} contactPenetration={kpis.other_series_contact_penetration} /></Col>
      </Row>

      <Card title="规模与漏斗趋势" style={{ marginTop: 16 }} extra={
        <Select mode="multiple" size="small" style={{ width: 360, maxWidth: "50vw" }} value={scaleMetrics}
          onChange={(value) => setScaleMetrics(value.length > 0 ? value : ["leads"])} options={SCALE_OPTIONS}
          showSearch optionFilterProp="label" maxTagCount="responsive" listHeight={280}
          popupMatchSelectWidth={360} placeholder="搜索并选择规模指标" />
      }>
        <div className="chart-container"><ReactECharts option={buildTrendOption(scaleMetrics, trend)} style={{ height: 400 }} notMerge /></div>
      </Card>

      <Card title="结构趋势" style={{ marginTop: 16 }} extra={
        <StructureMetricSelector value={structureMetrics} onChange={setStructureMetrics} />
      }>
        <div className="chart-container"><ReactECharts option={buildTrendOption(structureMetrics, trend)} style={{ height: 400 }} notMerge /></div>
      </Card>
    </div>
  );
}
