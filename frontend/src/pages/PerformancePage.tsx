import { useEffect, useState } from "react";
import { Card, Table, Spin, Empty, Row, Col, Statistic } from "antd";
import { useNavigate } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import { useFilterStore } from "../stores/filterStore";
import { getPerformanceRanking } from "../api/dashboard";
import type { PerformanceRanking } from "../types/dashboard";
import { formatCurrency, formatPercent } from "../utils/formatters";
import { CHART_COLORS } from "../utils/chartColors";

export default function PerformancePage() {
  const navigate = useNavigate();
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const [data, setData] = useState<PerformanceRanking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPerformanceRanking(filters, filterLogic, startDate, endDate)
      .then(setData)
      .finally(() => setLoading(false));
  }, [filters, filterLogic, startDate, endDate]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  if (!data) return <Empty description="暂无数据" />;

  const { rankings, team_summary } = data;

  const columns = [
    { title: "排名", dataIndex: "rank", key: "rank", width: 60, sorter: (a: any, b: any) => a.rank - b.rank },
    {
      title: "销售员",
      dataIndex: "salesperson",
      key: "salesperson",
      render: (v: string) => <a onClick={() => navigate(`/performance/${encodeURIComponent(v)}`)}>{v}</a>,
    },
    { title: "总线索", dataIndex: "total_leads", key: "total_leads", sorter: (a: any, b: any) => a.total_leads - b.total_leads },
    { title: "成交数", dataIndex: "deals", key: "deals", sorter: (a: any, b: any) => a.deals - b.deals },
    {
      title: "成交率",
      dataIndex: "deal_rate",
      key: "deal_rate",
      render: (v: number) => formatPercent(v, 1),
      sorter: (a: any, b: any) => a.deal_rate - b.deal_rate,
    },
    {
      title: "销售额",
      dataIndex: "revenue",
      key: "revenue",
      render: (v: number) => formatCurrency(v),
      sorter: (a: any, b: any) => a.revenue - b.revenue,
    },
    {
      title: "客单价",
      dataIndex: "avg_deal",
      key: "avg_deal",
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "触客率",
      dataIndex: "contacted_rate",
      key: "contacted_rate",
      render: (v: number) => formatPercent(v, 1),
    },
    { title: "退款", dataIndex: "refunds", key: "refunds" },
  ];

  const top10 = rankings.slice(0, 10);
  const barOption = {
    tooltip: { trigger: "axis" },
    legend: { data: ["成交数", "成交率"], bottom: 0 },
    grid: { left: 80, right: 60, top: 20, bottom: 50 },
    xAxis: {
      type: "category",
      data: top10.map((r) => r.salesperson),
      axisLabel: { rotate: 30, fontSize: 11 },
    },
    yAxis: [
      { type: "value", name: "成交数" },
      { type: "value", name: "成交率", axisLabel: { formatter: (v: number) => (v * 100).toFixed(0) + "%" } },
    ],
    series: [
      {
        name: "成交数",
        type: "bar",
        data: top10.map((r, i) => ({
          value: r.deals,
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
      },
      {
        name: "成交率",
        type: "line",
        yAxisIndex: 1,
        data: top10.map((r) => r.deal_rate),
        itemStyle: { color: "#ff4d4f" },
      },
    ],
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic title="销售员总数" value={team_summary?.total_salespeople as number || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="平均成交率" value={formatPercent(team_summary?.avg_deal_rate as number || 0, 1)} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总销售额" value={formatCurrency(team_summary?.total_revenue as number || 0)} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="TOP 销售员" value={team_summary?.top_performer as string || "-"} />
          </Card>
        </Col>
      </Row>

      <Card title="TOP 10 销售员对比" style={{ marginTop: 16 }}>
        <ReactECharts option={barOption} style={{ height: 400 }} notMerge />
      </Card>

      <Card title="销售员排名" style={{ marginTop: 16 }}>
        <Table
          dataSource={rankings}
          columns={columns}
          rowKey="salesperson"
          size="small"
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}
