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

export default function PerformanceDetail() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { startDate, endDate } = useFilterStore();
  const [data, setData] = useState<PerformanceDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    getPerformanceDetail(decodeURIComponent(name), startDate, endDate)
      .then(setData)
      .finally(() => setLoading(false));
  }, [name, startDate, endDate]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  if (!data || !data.summary) return <Empty description="暂无该销售员数据" />;

  const { summary, monthly_trend, by_product, by_model, funnel } = data;

  const trendOption = {
    tooltip: { trigger: "axis" },
    legend: { data: ["线索数", "成交数"], bottom: 0 },
    grid: { left: 60, right: 30, top: 20, bottom: 40 },
    xAxis: { type: "category", data: monthly_trend.map((t) => t.day), axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: { type: "value", name: "数量" },
    series: [
      { name: "线索数", type: "line", data: monthly_trend.map((t) => t.leads), smooth: true, itemStyle: { color: CHART_COLORS[0] } },
      { name: "成交数", type: "line", data: monthly_trend.map((t) => t.deals), smooth: true, itemStyle: { color: CHART_COLORS[1] } },
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

      <h2 style={{ marginBottom: 16 }}>{summary.salesperson} - 业绩详情</h2>

      <Card title="个人漏斗">
        <div style={{ display: "flex", justifyContent: "space-around", padding: "20px 0" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: CHART_COLORS[0] }}>{funnel.total_leads}</div>
            <div style={{ color: "#8c8c8c" }}>总线索</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: CHART_COLORS[1] }}>{funnel.contacted}</div>
            <div style={{ color: "#8c8c8c" }}>已触客 ({formatPercent(summary.contacted_rate, 1)})</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: CHART_COLORS[3] }}>{funnel.deals}</div>
            <div style={{ color: "#8c8c8c" }}>已成交 ({formatPercent(summary.deal_rate, 1)})</div>
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={6}><Card><Statistic title="总线索" value={summary.total_leads} /></Card></Col>
        <Col span={6}><Card><Statistic title="成交数" value={summary.deals} valueStyle={{ color: "#52c41a" }} /></Card></Col>
        <Col span={6}><Card><Statistic title="销售额" value={formatCurrency(summary.revenue)} /></Card></Col>
        <Col span={6}><Card><Statistic title="客单价" value={formatCurrency(summary.avg_deal)} /></Card></Col>
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
