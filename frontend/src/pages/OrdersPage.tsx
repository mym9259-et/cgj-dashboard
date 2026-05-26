import { useEffect, useState } from "react";
import { Card, Col, Row, Spin, Empty } from "antd";
import ReactECharts from "echarts-for-react";
import { useFilterStore } from "../stores/filterStore";
import { getOrders } from "../api/dashboard";
import type { OrderStructure } from "../types/dashboard";
import { formatCurrency } from "../utils/formatters";
import { CHART_COLORS } from "../utils/chartColors";
import { useDebounce } from "../hooks/useDebounce";

export default function OrdersPage() {
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const debouncedFilters = useDebounce(filters, 300);
  const debouncedLogic = useDebounce(filterLogic, 300);
  const debouncedStartDate = useDebounce(startDate, 300);
  const debouncedEndDate = useDebounce(endDate, 300);
  const [data, setData] = useState<OrderStructure | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getOrders(debouncedFilters, debouncedLogic, debouncedStartDate, debouncedEndDate)
      .then(setData)
      .finally(() => setLoading(false));
  }, [debouncedFilters, debouncedLogic, debouncedStartDate, debouncedEndDate]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  if (!data) return <Empty description="暂无数据" />;

  const { product_distribution, brand_model_ranking, price_ranges, demographics } = data;

  const pieOption = (items: { name: string; count: number }[], labelPosition: "outside" | "none" = "outside") => ({
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: labelPosition === "outside"
      ? { orient: "vertical", right: 8, top: 36, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } }
      : { show: false },
    series: [
      {
        type: "pie",
        radius: labelPosition === "outside" ? ["35%", "62%"] : ["40%", "70%"],
        center: labelPosition === "outside" ? ["38%", "52%"] : ["50%", "50%"],
        label: { show: labelPosition === "outside", position: "outside", formatter: "{b}", fontSize: 11 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.5)" } },
        data: items.map((d, i) => ({
          value: d.count,
          name: d.name || "(空)",
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
      },
    ],
  });

  const barOption = (items: { name: string; count: number }[], horizontal: boolean) => ({
    tooltip: { trigger: "axis" },
    grid: { left: horizontal ? 60 : 40, right: 20, top: 10, bottom: horizontal ? 10 : 60, containLabel: true },
    [horizontal ? "yAxis" : "xAxis"]: {
      type: "category",
      data: items.slice(0, 15).map((d) => d.name || "(空)"),
      axisLabel: {
        rotate: horizontal ? 0 : 35,
        fontSize: horizontal ? 11 : 10,
        interval: 0,
        overflow: "truncate",
        width: horizontal ? 90 : undefined,
      },
    },
    [horizontal ? "xAxis" : "yAxis"]: { type: "value", axisLabel: { fontSize: 10 } },
    series: [
      {
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
    grid: { left: 40, right: 70, top: 10, bottom: 30, containLabel: true },
    xAxis: { type: "category", data: price_ranges.map((r) => r.range_label), axisLabel: { fontSize: 10 } },
    yAxis: [
      { type: "value", name: "单数", nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10 } },
      { type: "value", name: "金额(元)", nameTextStyle: { fontSize: 10 }, axisLabel: { formatter: (v: number) => (v / 10000).toFixed(0) + "w", fontSize: 10 } },
    ],
    series: [
      {
        name: "单数", type: "bar",
        data: price_ranges.map((r, i) => ({
          value: r.count, revenue: r.revenue,
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
      },
      { name: "销售额", type: "line", yAxisIndex: 1, data: price_ranges.map((r) => r.revenue), itemStyle: { color: "#ff4d4f" } },
    ],
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xl={8} md={12} xs={24}>
          <Card title="产品类型分布" size="small">
            <ReactECharts option={pieOption(product_distribution.by_type)} style={{ height: 280 }} notMerge />
          </Card>
        </Col>
        <Col xl={8} md={12} xs={24}>
          <Card title="品牌分布" size="small">
            <ReactECharts option={pieOption(brand_model_ranking.by_brand)} style={{ height: 280 }} notMerge />
          </Card>
        </Col>
        <Col xl={8} md={12} xs={24}>
          <Card title="车主类型" size="small">
            <ReactECharts option={pieOption(demographics.owner_type)} style={{ height: 280 }} notMerge />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xl={12} md={24}>
          <Card title="车系 TOP 15" size="small">
            <ReactECharts option={barOption(brand_model_ranking.by_model, true)} style={{ height: 360 }} notMerge />
          </Card>
        </Col>
        <Col xl={12} md={24}>
          <Card title="价格区间分布" size="small">
            <ReactECharts option={priceBarOption} style={{ height: 360 }} notMerge />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xl={12} md={24}>
          <Card title="客户性别与年龄段" size="small">
            <Row gutter={0}>
              <Col span={12}>
                <ReactECharts option={pieOption(demographics.gender, "none")} style={{ height: 260 }} notMerge />
              </Col>
              <Col span={12}>
                <ReactECharts option={barOption(demographics.age_group, false)} style={{ height: 260 }} notMerge />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xl={12} md={24}>
          <Card title="购车付款方式" size="small">
            <ReactECharts option={barOption(demographics.payment_method, false)} style={{ height: 280 }} notMerge />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
