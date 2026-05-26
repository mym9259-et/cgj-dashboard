import { useEffect, useState, useMemo } from "react";
import { Card, Table, Spin, Empty, Row, Col, Statistic, Select, Checkbox } from "antd";
import { useNavigate } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import { useFilterStore } from "../stores/filterStore";
import { getPerformanceRanking } from "../api/dashboard";
import type { PerformanceRanking, RankingItem } from "../types/dashboard";
import { formatCurrency, formatPercent } from "../utils/formatters";
import { CHART_COLORS } from "../utils/chartColors";
import { useDebounce } from "../hooks/useDebounce";

type SortField = "revenue" | "total_leads" | "deals" | "delivery_penetration" | "contact_penetration";

const SORT_OPTIONS: { label: string; value: SortField }[] = [
  { label: "总销售额", value: "revenue" },
  { label: "总触客数", value: "total_leads" },
  { label: "总成交数", value: "deals" },
  { label: "交付渗透率", value: "delivery_penetration" },
  { label: "触客渗透率", value: "contact_penetration" },
];

type OverlayField = "revenue" | "total_leads" | "deals" | "delivery_penetration" | "contact_penetration";

const OVERLAY_OPTIONS: { label: string; value: OverlayField }[] = [
  { label: "总销售额", value: "revenue" },
  { label: "总触客数", value: "total_leads" },
  { label: "总成交数", value: "deals" },
  { label: "交付渗透率", value: "delivery_penetration" },
  { label: "触客渗透率", value: "contact_penetration" },
];

const OVERLAY_LABELS: Record<OverlayField, string> = {
  revenue: "总销售额",
  total_leads: "总触客数",
  deals: "总成交数",
  delivery_penetration: "交付渗透率",
  contact_penetration: "触客渗透率",
};

const PERCENT_FIELDS: Set<OverlayField> = new Set(["delivery_penetration", "contact_penetration"]);

export default function PerformancePage() {
  const navigate = useNavigate();
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const debouncedFilters = useDebounce(filters, 300);
  const debouncedLogic = useDebounce(filterLogic, 300);
  const debouncedStartDate = useDebounce(startDate, 300);
  const debouncedEndDate = useDebounce(endDate, 300);
  const [data, setData] = useState<PerformanceRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("revenue");
  const [overlayFields, setOverlayFields] = useState<OverlayField[]>(["deals", "delivery_penetration"]);

  useEffect(() => {
    setLoading(true);
    getPerformanceRanking(debouncedFilters, debouncedLogic, debouncedStartDate, debouncedEndDate)
      .then(setData)
      .finally(() => setLoading(false));
  }, [debouncedFilters, debouncedLogic, debouncedStartDate, debouncedEndDate]);

  // Sort by selected field, take top 10
  const top10 = useMemo(() => {
    if (!data) return [];
    return [...data.rankings]
      .sort((a, b) => {
        const av = (a as any)[sortField] ?? 0;
        const bv = (b as any)[sortField] ?? 0;
        return bv - av;
      })
      .slice(0, 10);
  }, [data, sortField]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  if (!data) return <Empty description="暂无数据" />;

  const { rankings, team_summary } = data;

  const columns = [
    { title: "排名", dataIndex: "rank", key: "rank", width: 60, sorter: (a: any, b: any) => a.rank - b.rank },
    {
      title: "销售员", dataIndex: "salesperson", key: "salesperson", width: 80,
      render: (v: string) => <a onClick={() => navigate(`/performance/${encodeURIComponent(v)}`)}>{v}</a>,
    },
    { title: "总交付", dataIndex: "total_leads", key: "total_leads", width: 80, sorter: (a: any, b: any) => a.total_leads - b.total_leads },
    { title: "成交数", dataIndex: "deals", key: "deals", width: 75, sorter: (a: any, b: any) => a.deals - b.deals },
    {
      title: "交付渗透率", dataIndex: "delivery_penetration", key: "delivery_penetration", width: 105,
      render: (v: number) => v != null ? formatPercent(v, 1) : "-",
      sorter: (a: any, b: any) => (a.delivery_penetration ?? 0) - (b.delivery_penetration ?? 0),
    },
    {
      title: "触客渗透率", dataIndex: "contact_penetration", key: "contact_penetration", width: 105,
      render: (v: number) => v != null ? formatPercent(v, 1) : "-",
      sorter: (a: any, b: any) => (a.contact_penetration ?? 0) - (b.contact_penetration ?? 0),
    },
    {
      title: "触客率", dataIndex: "contacted_rate", key: "contacted_rate", width: 80,
      render: (v: number) => formatPercent(v, 1),
    },
    { title: "销售额", dataIndex: "revenue", key: "revenue", width: 100, render: (v: number) => formatCurrency(v), sorter: (a: any, b: any) => a.revenue - b.revenue },
    { title: "客单价", dataIndex: "avg_deal", key: "avg_deal", width: 85, render: (v: number) => formatCurrency(v) },
    {
      title: "所在商户", dataIndex: "merchant_name", key: "merchant_name", width: 220, ellipsis: true,
      render: (v: string) => v || "-",
    },
    { title: "退款", dataIndex: "refunds", key: "refunds", width: 60 },
  ];

  // Build chart series
  const hasPercentOverlay = overlayFields.some((f) => PERCENT_FIELDS.has(f));
  const hasNonPercentOverlay = overlayFields.some((f) => !PERCENT_FIELDS.has(f));

  const yAxisConfig: any[] = [{ type: "value", name: "数值" }];
  if (hasPercentOverlay) {
    yAxisConfig.push({
      type: "value",
      name: "比率",
      max: 1,
      axisLabel: { formatter: (v: number) => (v * 100).toFixed(0) + "%" },
    });
  }

  const makeSeries = (field: OverlayField, color: string, index: number) => {
    const isPercent = PERCENT_FIELDS.has(field);
    return {
      name: OVERLAY_LABELS[field],
      type: isPercent ? "line" as const : "bar" as const,
      yAxisIndex: isPercent ? 1 : 0,
      data: top10.map((r) => (r as any)[field] ?? 0),
      itemStyle: { color },
      lineStyle: isPercent ? { width: 2 } : undefined,
    };
  };

  const barOption = {
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return "";
        const idx = params[0]?.dataIndex ?? 0;
        const r = top10[idx];
        if (!r) return "";
        let html = `<strong>${r.salesperson}</strong>`;
        if (r.merchant_name) html += `<br/>商户: ${r.merchant_name}`;
        html += "<br/>";
        for (const p of params) {
          const val = p.seriesName && PERCENT_FIELDS.has(p.seriesName as any)
            ? formatPercent(p.value, 1)
            : p.seriesName === "总销售额"
              ? formatCurrency(p.value)
              : p.value?.toLocaleString() ?? "-";
          html += `${p.marker} ${p.seriesName}: ${val}<br/>`;
        }
        return html;
      },
    },
    legend: {
      data: overlayFields.map((f) => OVERLAY_LABELS[f]),
      bottom: 0,
      type: "scroll" as const,
    },
    grid: { left: 60, right: 60, top: 20, bottom: 50, containLabel: true },
    xAxis: {
      type: "category",
      data: top10.map((r) => r.salesperson),
      axisLabel: { rotate: 30, fontSize: 11, interval: 0 },
    },
    yAxis: yAxisConfig,
    series: overlayFields.map((f, i) =>
      makeSeries(f, CHART_COLORS[i % CHART_COLORS.length], i)
    ),
  };

  return (
    <div>
      <Row gutter={[12, 12]}>
        <Col span={6}>
          <Card size="small"><Statistic title="销售员总数" value={team_summary?.total_salespeople as number || 0} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="平均成交率" value={formatPercent(team_summary?.avg_deal_rate as number || 0, 1)} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="总销售额" value={formatCurrency(team_summary?.total_revenue as number || 0)} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="TOP 销售员" value={team_summary?.top_performer as string || "-"} /></Card>
        </Col>
      </Row>

      <Card
        title="TOP 10 销售员对比"
        style={{ marginTop: 16 }}
        extra={
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#8c8c8c", whiteSpace: "nowrap" }}>排序:</span>
            <Select
              size="small"
              style={{ width: 110 }}
              value={sortField}
              onChange={(v) => setSortField(v)}
              options={SORT_OPTIONS}
            />
            <span style={{ fontSize: 12, color: "#8c8c8c", whiteSpace: "nowrap" }}>显示:</span>
            <Checkbox.Group
              value={overlayFields}
              onChange={(v) => {
                if (v.length > 0) setOverlayFields(v as OverlayField[]);
              }}
              options={OVERLAY_OPTIONS}
            />
          </div>
        }
      >
        {top10.length > 0 ? (
          <ReactECharts option={barOption} style={{ height: 400 }} notMerge />
        ) : (
          <Empty />
        )}
      </Card>

      <Card title="销售员排名" style={{ marginTop: 16 }}>
        <Table
          dataSource={rankings}
          columns={columns}
          rowKey="salesperson"
          size="small"
          scroll={{ x: 1080 }}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}
