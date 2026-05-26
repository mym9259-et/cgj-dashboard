import { useEffect, useState } from "react";
import { Card, Select, Spin, Empty, Table, Row, Col } from "antd";
import type { ColumnsType } from "antd/es/table";
import ReactECharts from "echarts-for-react";
import { useFilterStore } from "../stores/filterStore";
import { getFunnel } from "../api/dashboard";
import type { FunnelData, FunnelBreakdownItem } from "../types/dashboard";
import { formatPercent } from "../utils/formatters";
import { CHART_COLORS, FUNNEL_COLORS } from "../utils/chartColors";
import { getFieldLabel } from "../utils/fieldLabels";
import { useDebounce } from "../hooks/useDebounce";

const DIMENSIONS = [
  { label: "销售员", value: "salesperson" },
  { label: "品牌", value: "brand" },
  { label: "车系", value: "model_series" },
  { label: "产品类型", value: "product_type" },
  { label: "商户", value: "merchant_name" },
  { label: "客户来源", value: "customer_source" },
];

type DrillMetric = "deals" | "contacted" | "delivery_penetration" | "contact_penetration" | "contact_rate";

const DRILL_METRIC_OPTIONS: { label: string; value: DrillMetric }[] = [
  { label: "成交数", value: "deals" },
  { label: "触客数", value: "contacted" },
  { label: "交付渗透率", value: "delivery_penetration" },
  { label: "触客渗透率", value: "contact_penetration" },
  { label: "触客率", value: "contact_rate" },
];

export default function FunnelPage() {
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const debouncedFilters = useDebounce(filters, 300);
  const debouncedLogic = useDebounce(filterLogic, 300);
  const debouncedStartDate = useDebounce(startDate, 300);
  const debouncedEndDate = useDebounce(endDate, 300);
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dimension, setDimension] = useState<string | undefined>();
  const [drillMetric, setDrillMetric] = useState<DrillMetric>("deals");

  useEffect(() => {
    setLoading(true);
    getFunnel(debouncedFilters, debouncedLogic, debouncedStartDate, debouncedEndDate, dimension)
      .then(setData)
      .finally(() => setLoading(false));
  }, [debouncedFilters, debouncedLogic, debouncedStartDate, debouncedEndDate, dimension]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  if (!data) return <Empty description="暂无数据" />;

  const breakdownItems: FunnelBreakdownItem[] =
    dimension && data.breakdown[dimension] ? data.breakdown[dimension] : [];

  // Funnel chart
  const funnelOption = {
    tooltip: {
      trigger: "item",
      formatter: (p: any) => `${p.name}: ${p.value} (${formatPercent(p.data?.pct ?? 0, 1)})`,
    },
    series: [
      {
        type: "funnel",
        left: "15%",
        right: "15%",
        top: 20,
        bottom: 20,
        width: "70%",
        minSize: "20%",
        gap: 4,
        label: { show: true, position: "inside", formatter: "{b}" },
        labelLine: { show: false },
        itemStyle: { borderColor: "#fff", borderWidth: 1 },
        data: data.stages.map((s, i) => ({
          name: s.name,
          value: s.count,
          pct: s.pct,
          itemStyle: { color: FUNNEL_COLORS[i] || CHART_COLORS[i] },
        })),
      },
    ],
  };

  // Drill-down bar chart
  const barData = breakdownItems.slice(0, 20);
  const isPercentMetric = ["delivery_penetration", "contact_penetration", "contact_rate"].includes(drillMetric);

  const barOption = {
    tooltip: {
      trigger: "axis",
      valueFormatter: (value: number | undefined) => {
        if (value === undefined) return "-";
        return isPercentMetric ? formatPercent(value, 1) : value.toLocaleString();
      },
    },
    grid: { left: 60, right: 40, top: 10, bottom: isPercentMetric ? 20 : 60, containLabel: true },
    xAxis: {
      type: "category",
      data: barData.map((d) => d.name),
      axisLabel: { rotate: 45, fontSize: 10 },
    },
    yAxis: {
      type: "value",
      axisLabel: isPercentMetric
        ? { formatter: (v: number) => (v * 100).toFixed(0) + "%" }
        : {},
    },
    series: [
      {
        name: DRILL_METRIC_OPTIONS.find((m) => m.value === drillMetric)?.label || "",
        type: "bar",
        data: barData.map((d, i) => ({
          value: (d as any)[drillMetric] ?? 0,
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
      },
    ],
  };

  const breakdownColumns: ColumnsType<FunnelBreakdownItem> = [
    { title: "名称", dataIndex: "name", key: "name", fixed: "left", width: 120 },
    { title: "总交付", dataIndex: "total_leads", key: "total_leads", width: 90 },
    { title: "触客数", dataIndex: "contacted", key: "contacted", width: 90 },
    { title: "成交数", dataIndex: "deals", key: "deals", width: 90 },
    {
      title: "触客率", dataIndex: "contact_rate", key: "contact_rate", width: 90,
      render: (v: number) => formatPercent(v, 1),
    },
    {
      title: "交付渗透率", dataIndex: "delivery_penetration", key: "delivery_penetration", width: 110,
      render: (v: number) => formatPercent(v, 1),
      sorter: (a: any, b: any) => a.delivery_penetration - b.delivery_penetration,
    },
    {
      title: "触客渗透率", dataIndex: "contact_penetration", key: "contact_penetration", width: 110,
      render: (v: number) => formatPercent(v, 1),
      sorter: (a: any, b: any) => a.contact_penetration - b.contact_penetration,
    },
    {
      title: "触客-成交转化", dataIndex: "conversion_rate", key: "conversion_rate", width: 120,
      render: (v: number) => formatPercent(v, 1),
    },
  ];

  return (
    <div>
      <Row gutter={16}>
        <Col span={10}>
          <Card title="转化漏斗" bodyStyle={{ padding: "12px 0" }}>
            <ReactECharts option={funnelOption} style={{ height: 360 }} notMerge />
            <div style={{ display: "flex", justifyContent: "space-around", padding: "0 16px" }}>
              {data.stages.map((s, i) => (
                <div key={s.name} style={{ textAlign: "center" }}>
                  <div style={{ color: FUNNEL_COLORS[i] || CHART_COLORS[i], fontWeight: 600, fontSize: 18 }}>
                    {s.count.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                    {s.name}
                    {s.rate_to_prev !== null ? ` (${formatPercent(s.rate_to_prev, 1)})` : ""}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col span={14}>
          <Card
            title="漏斗下钻"
            extra={
              <div style={{ display: "flex", gap: 8 }}>
                <Select
                  size="small"
                  style={{ width: 120 }}
                  placeholder="选择维度"
                  allowClear
                  value={dimension}
                  onChange={setDimension}
                  options={DIMENSIONS}
                />
                <Select
                  size="small"
                  style={{ width: 130 }}
                  value={drillMetric}
                  onChange={setDrillMetric}
                  options={DRILL_METRIC_OPTIONS}
                />
              </div>
            }
          >
            {breakdownItems.length > 0 ? (
              <ReactECharts option={barOption} style={{ height: 360 }} notMerge />
            ) : (
              <Empty description="请选择下钻维度" style={{ padding: 60 }} />
            )}
          </Card>
        </Col>
      </Row>

      {breakdownItems.length > 0 && (
        <Card
          title={`${dimension ? getFieldLabel(dimension) : ""} 漏斗明细`}
          style={{ marginTop: 16 }}
        >
          <Table
            dataSource={breakdownItems}
            columns={breakdownColumns}
            rowKey="name"
            size="small"
            scroll={{ x: 850 }}
            pagination={{ pageSize: 15 }}
          />
        </Card>
      )}
    </div>
  );
}
