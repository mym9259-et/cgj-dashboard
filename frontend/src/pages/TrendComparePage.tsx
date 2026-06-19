import { useEffect, useState } from "react";
import { Card, Select, Row, Col, Spin, Empty, Divider } from "antd";
import ReactECharts from "echarts-for-react";
import { useFilterStore } from "../stores/filterStore";
import apiClient from "../api/client";
import { formatPercent } from "../utils/formatters";
import { CHART_COLORS } from "../utils/chartColors";
import { useDebounce } from "../hooks/useDebounce";

const DIMENSIONS = [
  { label: "零跑大区", value: "lingpao_region" },
  { label: "省", value: "store_province" },
  { label: "市", value: "store_city" },
  { label: "门店总经理", value: "store_manager" },
];

const METRIC_OPTIONS = [
  { label: "线索数", value: "leads" },
  { label: "触客数", value: "contacted" },
  { label: "成交数", value: "deals" },
  { label: "销售额", value: "revenue" },
  { label: "交付渗透率", value: "delivery_penetration" },
  { label: "触客渗透率", value: "contact_penetration" },
  { label: "触客率", value: "contact_rate" },
  { label: "交付渗透率 MA7", value: "delivery_penetration_ma7" },
  { label: "触客渗透率 MA7", value: "contact_penetration_ma7" },
];

const METRIC_LABEL: Record<string, string> = {
  leads: "线索数", contacted: "触客数", deals: "成交数", revenue: "销售额",
  delivery_penetration: "交付渗透率", contact_penetration: "触客渗透率",
  delivery_penetration_ma7: "交付渗透率 MA7", contact_penetration_ma7: "触客渗透率 MA7",
  contact_rate: "触客率",
};

const PERCENT_METRICS = new Set([
  "delivery_penetration", "contact_penetration",
  "delivery_penetration_ma7", "contact_penetration_ma7", "contact_rate",
]);

export default function TrendComparePage() {
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const debouncedFilters = useDebounce(filters, 300);
  const [dimension, setDimension] = useState("lingpao_region");
  const [objects, setObjects] = useState<string[]>([]);
  const [metric, setMetric] = useState("delivery_penetration");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dimOptions, setDimOptions] = useState<string[]>([]);

  useEffect(() => {
    apiClient.get("/metadata/distinct-values", { params: { fields: dimension } })
      .then((r) => setDimOptions(r.data.values?.[dimension] || []))
      .catch(() => setDimOptions([]));
  }, [dimension]);

  useEffect(() => {
    if (objects.length === 0) { setData(null); return; }
    setLoading(true);
    const body: any = { dimension, objects, metric, filters: debouncedFilters, filter_logic: filterLogic };
    if (startDate) body.start_date = startDate;
    if (endDate) body.end_date = endDate;
    apiClient.post("/compare/trend", body)
      .then((r) => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [dimension, objects, metric, debouncedFilters, filterLogic, startDate, endDate]);

  const series = data?.series || [];
  const isPercent = PERCENT_METRICS.has(metric);

  const chartOption = series.length > 0 ? {
    tooltip: {
      trigger: "axis" as const,
      valueFormatter: (value: number | undefined) => {
        if (value === undefined) return "-";
        return isPercent ? (value * 100).toFixed(2) + "%" : value.toLocaleString();
      },
    },
    legend: { data: series.map((s: any) => s.name), bottom: 0, type: "scroll" as const },
    grid: { left: 60, right: 30, top: 20, bottom: 50, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: series[0]?.data?.map((d: any) => d.day) || [],
      axisLabel: { rotate: 45, fontSize: 10 },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: isPercent
        ? { formatter: (v: number) => (v * 100).toFixed(0) + "%" }
        : {},
    },
    series: series.map((s: any, i: number) => ({
      name: s.name,
      type: "line" as const,
      data: s.data?.map((d: any) => d.value) || [],
      smooth: true,
      itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
      lineStyle: { width: 2 },
    })),
  } : {};

  return (
    <div>
      <Card size="small">
        <Row gutter={[16, 12]} align="middle">
          <Col><span style={{ fontSize: 13, color: "#8c8c8c" }}>对比维度:</span></Col>
          <Col><Select size="small" value={dimension} onChange={(v) => { setDimension(v); setObjects([]); }} options={DIMENSIONS} style={{ width: 130 }} /></Col>
          <Col><span style={{ fontSize: 13, color: "#8c8c8c" }}>对比对象:</span></Col>
          <Col>
            <Select size="small" mode="multiple" value={objects} onChange={(v) => setObjects(v)}
              style={{ minWidth: 300 }} maxTagCount={5} placeholder="选择对比对象"
              options={[{ label: "总计", value: "总计" }, ...dimOptions.map((v) => ({ label: v, value: v }))]} />
          </Col>
          <Col><span style={{ fontSize: 13, color: "#8c8c8c" }}>对比指标:</span></Col>
          <Col>
            <Select size="small" value={metric} onChange={setMetric}
              style={{ width: 160 }} options={METRIC_OPTIONS} />
          </Col>
        </Row>
      </Card>

      <Divider style={{ margin: "12px 0" }} />

      {loading && <Spin size="large" style={{ display: "block", margin: "40px auto" }} />}
      {!loading && series.length === 0 && <Empty description="请选择对比对象" style={{ marginTop: 40 }} />}

      {series.length > 0 && (
        <Card size="small" title={`${METRIC_LABEL[metric] || metric} 趋势对比`}>
          <ReactECharts option={chartOption} style={{ height: 480 }} notMerge />
        </Card>
      )}
    </div>
  );
}
