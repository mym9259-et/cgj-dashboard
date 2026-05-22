import { useEffect, useState } from "react";
import { Card, Select, Spin, Empty, Table, Tabs, Row, Col } from "antd";
import ReactECharts from "echarts-for-react";
import { useFilterStore } from "../stores/filterStore";
import { getFunnel } from "../api/dashboard";
import type { FunnelData } from "../types/dashboard";
import { formatPercent } from "../utils/formatters";
import { CHART_COLORS, FUNNEL_COLORS } from "../utils/chartColors";
import { getFieldLabel } from "../utils/fieldLabels";

const DIMENSIONS = [
  { label: "销售员", value: "salesperson" },
  { label: "品牌", value: "brand" },
  { label: "车系", value: "model_series" },
  { label: "产品类型", value: "product_type" },
  { label: "商户", value: "merchant_name" },
  { label: "客户来源", value: "customer_source" },
];

export default function FunnelPage() {
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dimension, setDimension] = useState<string | undefined>();

  useEffect(() => {
    setLoading(true);
    getFunnel(filters, filterLogic, startDate, endDate, dimension)
      .then(setData)
      .finally(() => setLoading(false));
  }, [filters, filterLogic, startDate, endDate, dimension]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  if (!data) return <Empty description="暂无数据" />;

  const funnelOption = {
    tooltip: {
      trigger: "item",
      formatter: (p: any) => `${p.name}: ${p.value} (${formatPercent(p.data?.pct ?? 0, 1)})`,
    },
    series: [
      {
        type: "funnel",
        left: "20%",
        right: "20%",
        top: 20,
        bottom: 20,
        width: "60%",
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

  const breakdownItems =
    dimension && data.breakdown[dimension]
      ? data.breakdown[dimension]
      : [];

  const breakdownColumns = [
    { title: "名称", dataIndex: "name", key: "name" },
    { title: "总线索", dataIndex: "total_leads", key: "total_leads", sorter: (a: any, b: any) => a.total_leads - b.total_leads },
    { title: "触客数", dataIndex: "contacted", key: "contacted" },
    { title: "成交数", dataIndex: "deals", key: "deals", sorter: (a: any, b: any) => a.deals - b.deals },
    {
      title: "触客率",
      dataIndex: "contact_rate",
      key: "contact_rate",
      render: (v: number) => formatPercent(v, 1),
    },
    {
      title: "成交率",
      dataIndex: "deal_rate",
      key: "deal_rate",
      render: (v: number) => formatPercent(v, 1),
      sorter: (a: any, b: any) => a.deal_rate - b.deal_rate,
    },
    {
      title: "触客-成交转化",
      dataIndex: "conversion_rate",
      key: "conversion_rate",
      render: (v: number) => formatPercent(v, 1),
    },
  ];

  const barOption = {
    tooltip: { trigger: "axis" },
    legend: { data: ["触客数", "成交数"], bottom: 0 },
    grid: { left: 80, right: 30, top: 20, bottom: 50 },
    xAxis: {
      type: "category",
      data: breakdownItems.slice(0, 20).map((d) => d.name),
      axisLabel: { rotate: 45, fontSize: 10 },
    },
    yAxis: { type: "value", name: "数量" },
    series: [
      {
        name: "触客数",
        type: "bar",
        data: breakdownItems.slice(0, 20).map((d) => d.contacted),
        itemStyle: { color: CHART_COLORS[0] },
      },
      {
        name: "成交数",
        type: "bar",
        data: breakdownItems.slice(0, 20).map((d) => d.deals),
        itemStyle: { color: CHART_COLORS[1] },
      },
    ],
  };

  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Card title="转化漏斗">
            <ReactECharts option={funnelOption} style={{ height: 400 }} notMerge />
            <div style={{ display: "flex", justifyContent: "space-around", marginTop: 8 }}>
              {data.stages.map((s, i) => (
                <div key={s.name} style={{ textAlign: "center" }}>
                  <div style={{ color: CHART_COLORS[i], fontWeight: 600, fontSize: 18 }}>{s.count}</div>
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                    {s.name} {s.rate_to_prev !== null ? `(${formatPercent(s.rate_to_prev, 1)})` : ""}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title="漏斗下钻"
            extra={
              <Select
                style={{ width: 150 }}
                placeholder="选择维度"
                allowClear
                value={dimension}
                onChange={setDimension}
                options={DIMENSIONS}
              />
            }
          >
            {breakdownItems.length > 0 ? (
              <ReactECharts option={barOption} style={{ height: 400 }} notMerge />
            ) : (
              <Empty description="请选择下钻维度" style={{ padding: 80 }} />
            )}
          </Card>
        </Col>
      </Row>

      {breakdownItems.length > 0 && (
        <Card title={`${dimension ? getFieldLabel(dimension) : ""} 漏斗明细`} style={{ marginTop: 16 }}>
          <Table
            dataSource={breakdownItems}
            columns={breakdownColumns}
            rowKey="name"
            size="small"
            pagination={{ pageSize: 15 }}
          />
        </Card>
      )}
    </div>
  );
}
