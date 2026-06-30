import { useState } from "react";
import {
  Card,
  Col,
  Row,
  Select,
  Statistic,
} from "antd";
import ReactECharts from "echarts-for-react";
import { CHART_COLORS } from "../../utils/chartColors";
import { formatCurrency, formatPercent } from "../../utils/formatters";
import type { DashboardOverview, TrendItem } from "../../types/dashboard";

type MetricKey =
  | "leads" | "contacted" | "deals" | "revenue"
  | "delivery_penetration" | "contact_penetration" | "contact_rate"
  | "delivery_penetration_ma7" | "contact_penetration_ma7";

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
};

const PERCENT_METRICS = new Set<MetricKey>([
  "delivery_penetration", "contact_penetration", "contact_rate",
  "delivery_penetration_ma7", "contact_penetration_ma7",
]);

const DEFAULT_SCALE_METRICS: MetricKey[] = [
  "leads", "deals", "delivery_penetration", "contact_penetration",
];

const COMPOSITION_SERIES = [
  { key: "a_series_ratio", label: "A系", color: "#1677ff" },
  { key: "b_series_ratio", label: "B系", color: "#52c41a" },
  { key: "c_series_ratio", label: "C系", color: "#faad14" },
  { key: "d_series_ratio", label: "D系", color: "#ff4d4f" },
  { key: "lafa_series_ratio", label: "Lafa", color: "#722ed1" },
  { key: "other_series_ratio", label: "其他", color: "#8c8c8c" },
] as const;

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

function buildCompositionOption(trend: TrendItem[]) {
  const normalized = trend.map((item) => {
    const values = COMPOSITION_SERIES.map((series) => item[series.key] || 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    return total > 0 ? values.map((value) => value / total) : values;
  });

  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params];
        const total = items.reduce((sum: number, item: any) => sum + Number(item.value || 0), 0);
        const lines = items
          .slice()
          .reverse()
          .map((item: any) => `${item.marker} ${item.seriesName}: ${formatPercent(item.value, 1)}`);
        return `<strong>${items[0]?.axisValue || ""}</strong><br/>${lines.join("<br/>")}<br/>合计: ${formatPercent(total, 1)}`;
      },
    },
    legend: {
      data: COMPOSITION_SERIES.map((series) => series.label),
      top: 0,
      type: "scroll" as const,
    },
    grid: { left: 52, right: 24, top: 42, bottom: 68, containLabel: true },
    xAxis: {
      type: "category",
      data: trend.map((item) => item.day),
      axisLabel: { rotate: 45, fontSize: 10 },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 1,
      interval: 0.2,
      axisLabel: { formatter: (value: number) => `${Math.round(value * 100)}%` },
    },
    dataZoom: [
      { type: "inside" as const, start: Math.max(0, 100 - Math.min(100, 3000 / Math.max(trend.length, 1))), end: 100 },
      { type: "slider" as const, height: 18, bottom: 10, start: Math.max(0, 100 - Math.min(100, 3000 / Math.max(trend.length, 1))), end: 100 },
    ],
    series: COMPOSITION_SERIES.map((series, seriesIndex) => ({
      name: series.label,
      type: "bar",
      stack: "delivery-composition",
      barMaxWidth: 28,
      emphasis: { focus: "series" },
      itemStyle: { color: series.color },
      data: normalized.map((values) => values[seriesIndex]),
    })),
  };
}

export function DashboardOverviewContent({ data }: { data: DashboardOverview }) {
  const [scaleMetrics, setScaleMetrics] = useState<MetricKey[]>(DEFAULT_SCALE_METRICS);
  const { kpis, trend } = data;
  const penColor = (value: number, threshold: number) => value >= threshold ? "#52c41a" : "#faad14";

  return (
    <div>
      <div className="overview-kpi-grid">
        <Card size="small" className="kpi-card"><Statistic title="总交付" value={kpis.total_leads} /></Card>
        <Card size="small" className="kpi-card"><Statistic title="触客数" value={kpis.contacted_count} /></Card>
        <Card size="small" className="kpi-card"><Statistic title="成交数" value={kpis.deal_count} valueStyle={{ color: "#52c41a" }} /></Card>
        <Card size="small" className="kpi-card"><Statistic title="销售额" value={Math.round(kpis.total_revenue).toLocaleString()} /></Card>
        <Card size="small" className="kpi-card"><Statistic title="无忧产品5年期占比" value={formatPercent(kpis.wuyou_five_year_ratio, 1)} /></Card>
      </div>
      <div className="overview-kpi-grid overview-kpi-grid-spaced">
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

      <Card title="车系交付结构趋势" style={{ marginTop: 16 }}>
        <div className="chart-container"><ReactECharts option={buildCompositionOption(trend)} style={{ height: 400 }} notMerge /></div>
      </Card>
    </div>
  );
}
