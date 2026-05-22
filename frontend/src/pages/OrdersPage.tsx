import { useEffect, useState } from "react";
import { Card, Col, Row, Spin, Empty } from "antd";
import ReactECharts from "echarts-for-react";
import { useFilterStore } from "../stores/filterStore";
import { getOrders } from "../api/dashboard";
import type { OrderStructure } from "../types/dashboard";
import { formatCurrency } from "../utils/formatters";
import { CHART_COLORS } from "../utils/chartColors";

export default function OrdersPage() {
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const [data, setData] = useState<OrderStructure | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getOrders(filters, filterLogic, startDate, endDate)
      .then(setData)
      .finally(() => setLoading(false));
  }, [filters, filterLogic, startDate, endDate]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  if (!data) return <Empty description="暂无数据" />;

  const { product_distribution, brand_model_ranking, price_ranges, demographics } = data;

  const pieOption = (title: string, items: { name: string; count: number }[]) => ({
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { orient: "vertical", right: 10, top: 40 },
    series: [
      {
        name: title,
        type: "pie",
        radius: ["30%", "65%"],
        center: ["40%", "55%"],
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.5)" } },
        data: items.map((d, i) => ({
          value: d.count,
          name: d.name || "(空)",
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
      },
    ],
  });

  const barOption = (title: string, items: { name: string; count: number }[], horizontal: boolean = false) => ({
    tooltip: { trigger: "axis" },
    grid: { left: 80, right: 30, top: 10, bottom: horizontal ? 20 : 60 },
    [horizontal ? "yAxis" : "xAxis"]: {
      type: "category",
      data: items.slice(0, 15).map((d) => d.name || "(空)"),
      axisLabel: { rotate: horizontal ? 0 : 45, fontSize: 10 },
    },
    [horizontal ? "xAxis" : "yAxis"]: { type: "value" },
    series: [
      {
        name: title,
        type: "bar",
        data: items.slice(0, 15).map((d, i) => ({
          value: d.count,
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
      },
    ],
  });

  const priceBarOption = {
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const p = params[0];
        return `${p.name}<br/>数量: ${p.value} 单<br/>销售额: ${formatCurrency(p.data?.revenue)}`;
      },
    },
    grid: { left: 60, right: 80, top: 10, bottom: 40 },
    xAxis: { type: "category", data: price_ranges.map((r) => r.range_label) },
    yAxis: [
      { type: "value", name: "单数" },
      { type: "value", name: "金额(元)" },
    ],
    series: [
      {
        name: "单数",
        type: "bar",
        data: price_ranges.map((r, i) => ({
          value: r.count,
          revenue: r.revenue,
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
      },
      {
        name: "销售额",
        type: "line",
        yAxisIndex: 1,
        data: price_ranges.map((r) => r.revenue),
        itemStyle: { color: "#ff4d4f" },
      },
    ],
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card title="产品类型分布">
            <ReactECharts option={pieOption("产品类型", product_distribution.by_type)} style={{ height: 320 }} notMerge />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="品牌分布">
            <ReactECharts option={pieOption("品牌", brand_model_ranking.by_brand)} style={{ height: 320 }} notMerge />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="车主类型">
            <ReactECharts option={pieOption("车主类型", demographics.owner_type)} style={{ height: 320 }} notMerge />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="车系 TOP 15">
            <ReactECharts option={barOption("车系", brand_model_ranking.by_model, true)} style={{ height: 400 }} notMerge />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="价格区间分布">
            <ReactECharts option={priceBarOption} style={{ height: 400 }} notMerge />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="客户性别分布">
            <ReactECharts option={pieOption("性别", demographics.gender)} style={{ height: 300 }} notMerge />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="客户年龄段分布">
            <ReactECharts option={barOption("年龄", demographics.age_group)} style={{ height: 300 }} notMerge />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
