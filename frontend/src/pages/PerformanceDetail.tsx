import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Row, Col, Statistic, Spin, Empty, Button, Descriptions } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import { useFilterStore } from "../stores/filterStore";
import { getPerformanceDetail } from "../api/dashboard";
import type { PerformanceDetailData } from "../types/dashboard";
import { formatCurrency, formatPercent } from "../utils/formatters";
import { CHART_COLORS } from "../utils/chartColors";
import { useDebounce } from "../hooks/useDebounce";

export default function PerformanceDetail() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { startDate, endDate } = useFilterStore();
  const debouncedStartDate = useDebounce(startDate, 300);
  const debouncedEndDate = useDebounce(endDate, 300);
  const [data, setData] = useState<PerformanceDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    getPerformanceDetail(decodeURIComponent(name), debouncedStartDate, debouncedEndDate)
      .then(setData)
      .finally(() => setLoading(false));
  }, [name, debouncedStartDate, debouncedEndDate]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  if (!data || !data.summary) return <Empty description="暂无该销售员数据" />;

  const { summary, monthly_trend, by_product, by_model, funnel } = data;

  const trendOption = {
    tooltip: { trigger: "axis" },
    legend: { data: ["线索数", "成交数", "交付渗透率", "触客渗透率"], bottom: 0 },
    grid: { left: 60, right: 60, top: 20, bottom: 40, containLabel: true },
    xAxis: { type: "category", data: monthly_trend.map((t) => t.day), axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: [
      { type: "value", name: "数量" },
      { type: "value", name: "比率", axisLabel: { formatter: (v: number) => (v * 100).toFixed(0) + "%" } },
    ],
    series: [
      { name: "线索数", type: "line", data: monthly_trend.map((t) => t.leads), smooth: true, itemStyle: { color: CHART_COLORS[0] } },
      { name: "成交数", type: "line", data: monthly_trend.map((t) => t.deals), smooth: true, itemStyle: { color: CHART_COLORS[1] } },
      { name: "交付渗透率", type: "line", yAxisIndex: 1, data: monthly_trend.map((t) => t.delivery_penetration), smooth: true, itemStyle: { color: CHART_COLORS[5] } },
      { name: "触客渗透率", type: "line", yAxisIndex: 1, data: monthly_trend.map((t) => t.contact_penetration), smooth: true, itemStyle: { color: "#faad14" } },
    ],
  };

  const productPieOption = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    series: [
      {
        type: "pie",
        radius: ["35%", "65%"],
        center: ["50%", "55%"],
        label: { formatter: "{b}: {c}" },
        data: by_product.map((p, i) => ({
          value: p.count,
          name: p.name || "(空)",
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
      },
    ],
  };

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/performance")} style={{ marginBottom: 16 }}>
        返回排名
      </Button>

      <h2 style={{ marginBottom: 8 }}>{summary.salesperson} - 业绩详情</h2>
      {data.merchant_name && (
        <div style={{ marginBottom: 16, color: "#8c8c8c", fontSize: 13 }}>
          所在商户：{data.merchant_name}
        </div>
      )}

      <Row gutter={[12, 12]}>
        <Col span={4}><Card size="small"><Statistic title="总交付" value={summary.total_leads} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="成交数" value={summary.deals} valueStyle={{ color: "#52c41a" }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="交付渗透率" value={summary.delivery_penetration != null ? formatPercent(summary.delivery_penetration, 1) : "-"} valueStyle={{ color: (summary.delivery_penetration ?? 0) >= 0.3 ? "#52c41a" : "#faad14" }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="触客渗透率" value={summary.contact_penetration != null ? formatPercent(summary.contact_penetration, 1) : "-"} valueStyle={{ color: (summary.contact_penetration ?? 0) >= 0.4 ? "#52c41a" : "#faad14" }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="触客率" value={formatPercent(summary.contacted_rate, 1)} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="销售额" value={formatCurrency(summary.revenue)} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="月度趋势">
            {monthly_trend.length > 0 ? (
              <ReactECharts option={trendOption} style={{ height: 350 }} notMerge />
            ) : (
              <Empty />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="产品分布">
            {by_product.length > 0 ? (
              <ReactECharts option={productPieOption} style={{ height: 350 }} notMerge />
            ) : (
              <Empty />
            )}
          </Card>
        </Col>
      </Row>

      {by_model.length > 0 && (
        <Card title="成交车系分布" style={{ marginTop: 16 }}>
          <Descriptions column={4} size="small">
            {by_model.slice(0, 16).map((m, i) => (
              <Descriptions.Item key={i} label={m.name}>{m.count} 单</Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
    </div>
  );
}
