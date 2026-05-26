import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Spin, Empty, Select } from "antd";
import ReactECharts from "echarts-for-react";
import { useFilterStore } from "../stores/filterStore";
import { getOverview } from "../api/dashboard";
import type { DashboardOverview } from "../types/dashboard";
import { formatCurrency, formatPercent } from "../utils/formatters";
import { CHART_COLORS } from "../utils/chartColors";
import { useDebounce } from "../hooks/useDebounce";

type MetricKey =
  | "leads" | "contacted" | "deals" | "revenue"
  | "delivery_penetration" | "contact_penetration"
  | "delivery_penetration_ma7" | "contact_penetration_ma7" | "contact_rate";

const METRIC_OPTIONS: { label: string; value: MetricKey }[] = [
  { label: "线索数", value: "leads" },
  { label: "触客数", value: "contacted" },
  { label: "成交数", value: "deals" },
  { label: "销售额", value: "revenue" },
  { label: "交付渗透率", value: "delivery_penetration" },
  { label: "触客渗透率", value: "contact_penetration" },
  { label: "交付渗透率 MA7", value: "delivery_penetration_ma7" },
  { label: "触客渗透率 MA7", value: "contact_penetration_ma7" },
  { label: "触客率", value: "contact_rate" },
];

const DEFAULT_METRICS: MetricKey[] = ["leads", "deals", "delivery_penetration", "contact_penetration"];

const METRIC_LABEL: Record<MetricKey, string> = {
  leads: "线索数", contacted: "触客数", deals: "成交数", revenue: "销售额",
  delivery_penetration: "交付渗透率", contact_penetration: "触客渗透率",
  delivery_penetration_ma7: "交付渗透率 MA7", contact_penetration_ma7: "触客渗透率 MA7",
  contact_rate: "触客率",
};

const PERCENT_METRICS: MetricKey[] = [
  "delivery_penetration", "contact_penetration",
  "delivery_penetration_ma7", "contact_penetration_ma7", "contact_rate",
];

export default function DashboardPage() {
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const debouncedFilters = useDebounce(filters, 300);
  const debouncedLogic = useDebounce(filterLogic, 300);
  const debouncedStartDate = useDebounce(startDate, 300);
  const debouncedEndDate = useDebounce(endDate, 300);
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(DEFAULT_METRICS);

  useEffect(() => {
    setLoading(true);
    getOverview(debouncedFilters, debouncedLogic, debouncedStartDate, debouncedEndDate)
      .then(setData)
      .finally(() => setLoading(false));
  }, [debouncedFilters, debouncedLogic, debouncedStartDate, debouncedEndDate]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  if (!data) return <Empty description="暂无数据，请先上传数据文件" />;

  const { kpis, trend } = data;

  // KPI card color helpers
  const penColor = (v: number, threshold: number) => v >= threshold ? "#52c41a" : "#faad14";

  const yAxisConfig = (() => {
    const hasPercent = selectedMetrics.some((m) => PERCENT_METRICS.includes(m));
    const hasCount = selectedMetrics.some((m) => !PERCENT_METRICS.includes(m) && m !== "revenue");
    const hasRevenue = selectedMetrics.includes("revenue");
    const axes: any[] = [];
    if (hasCount || hasRevenue) axes.push({ type: "value", name: "数量/金额", axisLabel: { formatter: (v: number) => hasRevenue ? (v / 10000).toFixed(0) + "w" : v.toString() } });
    if (hasPercent) axes.push({ type: "value", name: "比率", axisLabel: { formatter: (v: number) => (v * 100).toFixed(0) + "%" } });
    if (axes.length === 0) axes.push({ type: "value", name: "" });
    return axes;
  })();

  const trendOption = {
    tooltip: { trigger: "axis", formatter: (params: any) => { if (!Array.isArray(params)) params = [params]; let html = `<strong>${params[0]?.axisValue || ""}</strong><br/>`; for (const p of params) { const val = PERCENT_METRICS.includes(p.seriesName as MetricKey) ? (p.value * 100).toFixed(2) + "%" : p.value?.toLocaleString() ?? "-"; html += `${p.marker} ${p.seriesName}: ${val}<br/>`; } return html; } },
    legend: { data: selectedMetrics.map((m) => METRIC_LABEL[m]), bottom: 0, type: "scroll" as const },
    grid: { left: 60, right: 60, top: 20, bottom: 50, containLabel: true },
    xAxis: { type: "category", data: trend.map((t) => t.day), axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: yAxisConfig,
    series: selectedMetrics.map((metric, i) => {
      const isPercent = PERCENT_METRICS.includes(metric);
      const yAxisIndex = isPercent ? (yAxisConfig.length > 1 ? 1 : 0) : 0;
      return {
        name: METRIC_LABEL[metric], type: "line", yAxisIndex,
        data: trend.map((t) => (t as any)[metric]),
        smooth: metric.endsWith("ma7"),
        itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        lineStyle: metric.endsWith("ma7") ? { width: 2, type: "dashed" as const } : { width: 2 },
      };
    }),
  };

  return (
    <div>
      <Row gutter={[12, 12]}>
        <Col xl={3} md={4} sm={6} xs={12}>
          <Card size="small" className="kpi-card"><Statistic title="总交付" value={kpis.total_leads} /></Card>
        </Col>
        <Col xl={3} md={4} sm={6} xs={12}>
          <Card size="small" className="kpi-card"><Statistic title="成交数" value={kpis.deal_count} valueStyle={{ color: "#52c41a" }} /></Card>
        </Col>
        <Col xl={3} md={4} sm={6} xs={12}>
          <Card size="small" className="kpi-card"><Statistic title="交付渗透率" value={formatPercent(kpis.delivery_penetration, 1)} valueStyle={{ color: penColor(kpis.delivery_penetration, 0.3) }} /></Card>
        </Col>
        <Col xl={3} md={4} sm={6} xs={12}>
          <Card size="small" className="kpi-card"><Statistic title="触客渗透率" value={formatPercent(kpis.contact_penetration, 1)} valueStyle={{ color: penColor(kpis.contact_penetration, 0.4) }} /></Card>
        </Col>
        <Col xl={3} md={4} sm={6} xs={12}>
          <Card size="small" className="kpi-card"><Statistic title="触客率" value={formatPercent(kpis.contact_rate, 1)} /></Card>
        </Col>
        <Col xl={3} md={4} sm={6} xs={12}>
          <Card size="small" className="kpi-card"><Statistic title="销售额" value={Math.round(kpis.total_revenue).toLocaleString()} /></Card>
        </Col>
        <Col xl={3} md={4} sm={6} xs={12}>
          <Card size="small" className="kpi-card"><Statistic title="客单价" value={formatCurrency(kpis.avg_deal_amount)} /></Card>
        </Col>
        <Col xl={3} md={4} sm={6} xs={12}>
          <Card size="small" className="kpi-card"><Statistic title="退款率" value={formatPercent(kpis.refund_rate, 2)} valueStyle={{ color: kpis.refund_rate > 0.02 ? "#ff4d4f" : "#52c41a" }} /></Card>
        </Col>
      </Row>

      <Card title="数据趋势" style={{ marginTop: 16 }}
        extra={
          <Select mode="multiple" size="small" style={{ minWidth: 200 }} value={selectedMetrics}
            onChange={(v) => setSelectedMetrics(v.length > 0 ? v : ["leads"])} options={METRIC_OPTIONS} maxTagCount={3} placeholder="选择指标" />
        }>
        <div className="chart-container">
          <ReactECharts option={trendOption} style={{ height: 420 }} notMerge />
        </div>
      </Card>
    </div>
  );
}
