import { useEffect, useState } from "react";
import { Card, Select, Row, Col, Spin, Empty, Table, Checkbox, Divider } from "antd";
import ReactECharts from "echarts-for-react";
import { useFilterStore } from "../stores/filterStore";
import apiClient from "../api/client";
import { formatCurrency, formatPercent } from "../utils/formatters";
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
  { label: "交付渗透率MA7", value: "delivery_penetration_ma7" },
  { label: "触客渗透率MA7", value: "contact_penetration_ma7" },
];

const METRIC_LABELS: Record<string, string> = {
  leads: "线索数", contacted: "触客数", deals: "成交数", revenue: "销售额",
  delivery_penetration: "交付渗透率", contact_penetration: "触客渗透率",
  delivery_penetration_ma7: "交付渗透率MA7", contact_penetration_ma7: "触客渗透率MA7",
};

const PERCENT_KEYS = new Set(["delivery_penetration", "contact_penetration", "delivery_penetration_ma7", "contact_penetration_ma7"]);

export default function ComparePage() {
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const debouncedFilters = useDebounce(filters, 300);
  const [dimension, setDimension] = useState("lingpao_region");
  const [objects, setObjects] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<string[]>(["leads", "deals", "delivery_penetration"]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dimOptions, setDimOptions] = useState<string[]>([]);

  // Fetch available dimension values
  useEffect(() => {
    apiClient.get("/metadata/distinct-values", { params: { fields: dimension } })
      .then((r) => {
        const vals = r.data.values?.[dimension] || [];
        setDimOptions(vals);
      })
      .catch(() => setDimOptions([]));
  }, [dimension]);

  // Fetch comparison data
  useEffect(() => {
    if (objects.length === 0) { setData(null); return; }
    setLoading(true);
    const body: any = { dimension, objects, metrics, filters: debouncedFilters, filter_logic: filterLogic };
    if (startDate) body.start_date = startDate;
    if (endDate) body.end_date = endDate;
    apiClient.post("/compare", body).then((r) => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [dimension, objects, metrics, debouncedFilters, filterLogic, startDate, endDate]);

  const items = data?.items || [];

  // Build chart option
  const selectAll = (d: string[]) => setObjects(d.length > 0 ? d : []);
  const toggleMetric = (m: string, checked: boolean) => {
    setMetrics((prev) => checked ? [...prev, m] : prev.filter((v) => v !== m));
  };

  const chartOption = items.length > 0 ? {
    tooltip: {
      trigger: "axis" as const,
      valueFormatter: (value: number | undefined) => {
        if (value === undefined) return "-";
        return value.toLocaleString();
      },
    },
    legend: { data: metrics.map((m) => METRIC_LABELS[m] || m), bottom: 0, type: "scroll" as const },
    grid: { left: 60, right: 30, top: 20, bottom: 50, containLabel: true },
    xAxis: { type: "category" as const, data: items.map((i: any) => i.name), axisLabel: { rotate: 30, fontSize: 11, interval: 0 } },
    yAxis: metrics.some((m) => PERCENT_KEYS.has(m))
      ? [
          { type: "value" as const, name: "数值" },
          { type: "value" as const, name: "比率", axisLabel: { formatter: (v: number) => (v * 100).toFixed(0) + "%" } },
        ]
      : [{ type: "value" as const }],
    series: metrics.map((m, i) => ({
      name: METRIC_LABELS[m] || m,
      type: "bar" as const,
      yAxisIndex: PERCENT_KEYS.has(m) ? 1 : 0,
      data: items.map((item: any, j: number) => ({
        value: item[m] ?? 0,
        itemStyle: { color: CHART_COLORS[j % CHART_COLORS.length] },
      })),
    })),
  } : {};

  const columns = [
    { title: "对象", dataIndex: "name", key: "name", fixed: "left" as const, width: 120 },
    ...metrics.map((m) => ({
      title: METRIC_LABELS[m] || m,
      dataIndex: m,
      key: m,
      width: 120,
      render: (v: number) => PERCENT_KEYS.has(m) ? formatPercent(v, 1) : m === "revenue" ? formatCurrency(v) : v?.toLocaleString() ?? "-",
    })),
  ];

  return (
    <div>
      <Card size="small">
        <Row gutter={[16, 12]} align="middle">
          <Col><span style={{ fontSize: 13, color: "#8c8c8c" }}>对比维度:</span></Col>
          <Col><Select size="small" value={dimension} onChange={(v) => { setDimension(v); setObjects([]); }} options={DIMENSIONS} style={{ width: 130 }} /></Col>
          <Col><span style={{ fontSize: 13, color: "#8c8c8c" }}>对比对象:</span></Col>
          <Col>
            <Select size="small" mode="multiple" value={objects} onChange={selectAll}
              style={{ minWidth: 300 }} maxTagCount={5}
              placeholder="选择对比对象（可多选，含总计）"
              options={[{ label: "总计", value: "总计" }, ...dimOptions.map((v) => ({ label: v, value: v }))]}
            />
          </Col>
        </Row>
        <Divider style={{ margin: "12px 0" }} />
        <Row gutter={[8, 0]} align="middle">
          <Col><span style={{ fontSize: 13, color: "#8c8c8c" }}>显示指标:</span></Col>
          <Col>
            <Checkbox.Group value={metrics} onChange={(v) => v.length > 0 && setMetrics(v as string[])}>
              <Row gutter={[12, 4]}>
                {METRIC_OPTIONS.map((m) => (
                  <Col key={m.value}><Checkbox value={m.value}>{m.label}</Checkbox></Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Col>
        </Row>
      </Card>

      {loading && <Spin size="large" style={{ display: "block", margin: "40px auto" }} />}
      {!loading && items.length === 0 && <Empty description="请选择对比对象" style={{ marginTop: 40 }} />}

      {items.length > 0 && (
        <>
          <Card size="small" style={{ marginTop: 16 }}>
            <ReactECharts option={chartOption} style={{ height: 400 }} notMerge />
          </Card>
          <Card size="small" title="对比数据明细" style={{ marginTop: 16 }}>
            <Table dataSource={items} columns={columns} rowKey="name" size="small" scroll={{ x: 200 + metrics.length * 120 }} pagination={false} />
          </Card>
        </>
      )}
    </div>
  );
}
