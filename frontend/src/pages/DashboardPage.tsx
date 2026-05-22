import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Spin, Empty } from "antd";
import {
  RiseOutlined,
  TeamOutlined,
  DollarOutlined,
  PercentageOutlined,
  FallOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import { useFilterStore } from "../stores/filterStore";
import { getOverview } from "../api/dashboard";
import type { DashboardOverview } from "../types/dashboard";
import { formatCurrency, formatPercent } from "../utils/formatters";
import { CHART_COLORS } from "../utils/chartColors";

export default function DashboardPage() {
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getOverview(filters, filterLogic, startDate, endDate)
      .then(setData)
      .finally(() => setLoading(false));
  }, [filters, filterLogic, startDate, endDate]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  if (!data) return <Empty description="暂无数据，请先上传数据文件" />;

  const { kpis, trend } = data;

  const trendOption = {
    tooltip: { trigger: "axis" },
    legend: { data: ["线索数", "触客数", "成交数", "销售额"], bottom: 0 },
    grid: { left: 60, right: 60, top: 20, bottom: 40 },
    xAxis: { type: "category", data: trend.map((t) => t.day), axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: [
      { type: "value", name: "数量", axisLabel: { formatter: "{value}" } },
      { type: "value", name: "金额(元)", axisLabel: { formatter: (v: number) => (v / 10000).toFixed(0) + "w" } },
    ],
    series: [
      { name: "线索数", type: "line", data: trend.map((t) => t.leads), smooth: true, itemStyle: { color: CHART_COLORS[0] } },
      { name: "触客数", type: "line", data: trend.map((t) => t.contacted), smooth: true, itemStyle: { color: CHART_COLORS[1] } },
      { name: "成交数", type: "line", data: trend.map((t) => t.deals), smooth: true, itemStyle: { color: CHART_COLORS[3] } },
      { name: "销售额", type: "line", yAxisIndex: 1, data: trend.map((t) => t.revenue), smooth: true, itemStyle: { color: CHART_COLORS[5] } },
    ],
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={4}>
          <Card className="kpi-card">
            <Statistic title="总线索数" value={kpis.total_leads} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="kpi-card">
            <Statistic title="成交数" value={kpis.deal_count} prefix={<RiseOutlined />} valueStyle={{ color: "#52c41a" }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="kpi-card">
            <Statistic
              title="成交率"
              value={formatPercent(kpis.deal_rate, 1)}
              prefix={<PercentageOutlined />}
              valueStyle={{ color: kpis.deal_rate >= 0.4 ? "#52c41a" : "#faad14" }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="kpi-card">
            <Statistic title="触客率" value={formatPercent(kpis.contacted_rate, 1)} prefix={<PhoneOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="kpi-card">
            <Statistic title="总销售额" value={formatCurrency(kpis.total_revenue)} prefix={<DollarOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="kpi-card">
            <Statistic
              title="退款率"
              value={formatPercent(kpis.refund_rate, 2)}
              prefix={<FallOutlined />}
              valueStyle={{ color: kpis.refund_rate > 0.02 ? "#ff4d4f" : "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="数据趋势" style={{ marginTop: 16 }}>
        <div className="chart-container">
          <ReactECharts option={trendOption} style={{ height: 400 }} notMerge />
        </div>
      </Card>
    </div>
  );
}
