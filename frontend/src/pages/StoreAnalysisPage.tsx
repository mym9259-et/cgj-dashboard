import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  Segmented,
  Select,
  Spin,
  Table,
  Tag,
  Popover,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import ReactECharts from "echarts-for-react";
import { getOverview } from "../api/dashboard";
import {
  getStorePeriodComparison,
  getStoreSalespeople,
  getStoreScore,
  searchStores,
} from "../api/storeAnalysis";
import { DashboardOverviewContent } from "../components/dashboard/DashboardOverviewContent";
import { SalespersonMetricsTable } from "../components/analysis/SalespersonMetricsTable";
import { useDebounce } from "../hooks/useDebounce";
import type {
  PeriodMetricKey,
  SalespersonStoreMetrics,
  SalespersonTrendItem,
  SalespersonTrendMetricKey,
  StoreAnalysisData,
  StorePeriod,
} from "../types/storeAnalysis";
import { formatCurrency, formatPercent } from "../utils/formatters";
import "./StoreAnalysisPage.css";

const { RangePicker } = DatePicker;

type PeriodMetricDefinition = {
  key: PeriodMetricKey;
  label: string;
  format: "integer" | "decimal" | "percent" | "currency";
  tone?: "series-ratio" | "series-penetration";
};

const PERIOD_METRICS: PeriodMetricDefinition[] = [
  { key: "deliveries", label: "交付数", format: "integer" },
  { key: "contacted", label: "触客数", format: "integer" },
  { key: "deals", label: "成交数", format: "integer" },
  { key: "contact_rate", label: "触客率", format: "percent" },
  { key: "contact_penetration", label: "触客渗透率", format: "percent" },
  { key: "delivery_penetration", label: "交付渗透率", format: "percent" },
  { key: "total_revenue", label: "总销售额", format: "currency" },
  { key: "avg_deal_amount", label: "客单价", format: "currency" },
  { key: "wuyou_five_year_ratio", label: "无忧产品5年期占比", format: "percent" },
  { key: "a_series_ratio", label: "A系交付占比", format: "percent", tone: "series-ratio" },
  { key: "a_series_contact_penetration", label: "A系触客渗透率", format: "percent", tone: "series-penetration" },
  { key: "b_series_ratio", label: "B系交付占比", format: "percent", tone: "series-ratio" },
  { key: "b_series_contact_penetration", label: "B系触客渗透率", format: "percent", tone: "series-penetration" },
  { key: "c_series_ratio", label: "C系交付占比", format: "percent", tone: "series-ratio" },
  { key: "c_series_contact_penetration", label: "C系触客渗透率", format: "percent", tone: "series-penetration" },
  { key: "d_series_ratio", label: "D系交付占比", format: "percent", tone: "series-ratio" },
  { key: "d_series_contact_penetration", label: "D系触客渗透率", format: "percent", tone: "series-penetration" },
  { key: "lafa_series_ratio", label: "Lafa交付占比", format: "percent", tone: "series-ratio" },
  { key: "lafa_series_contact_penetration", label: "Lafa触客渗透率", format: "percent", tone: "series-penetration" },
  { key: "avg_daily_deliveries", label: "日均交付数", format: "decimal" },
  { key: "avg_daily_contacted", label: "日均触客数", format: "decimal" },
  { key: "avg_daily_deals", label: "日均成交数", format: "decimal" },
  { key: "avg_daily_revenue", label: "日均产值", format: "currency" },
];

const SERIES_COLUMNS = [
  { key: "a_series", label: "A系" },
  { key: "b_series", label: "B系" },
  { key: "c_series", label: "C系" },
  { key: "d_series", label: "D系" },
  { key: "lafa_series", label: "Lafa" },
] as const;

function formatMetric(value: number, format: PeriodMetricDefinition["format"]) {
  if (format === "percent") return formatPercent(value, 1);
  if (format === "currency") return formatCurrency(value);
  if (format === "decimal") return value.toFixed(2);
  return value.toLocaleString();
}

function ChangeValue({ value }: { value: number | null }) {
  if (value === null) return <span className="period-change period-change-empty">--</span>;
  if (value === 0) return <span className="period-change period-change-flat">0.0%</span>;
  const positive = value > 0;
  return (
    <span className={`period-change ${positive ? "period-change-up" : "period-change-down"}`}>
      {positive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      {formatPercent(Math.abs(value), 1)}
    </span>
  );
}

export function PeriodComparisonTable({ periods, loading }: { periods: StorePeriod[]; loading: boolean }) {
  const columns = useMemo<ColumnsType<PeriodMetricDefinition>>(() => [
    {
      title: "经营指标",
      dataIndex: "label",
      key: "label",
      fixed: "left",
      width: 142,
      render: (label: string, record) => (
        <span className={record.tone === "series-penetration" ? "series-penetration-label" : ""}>
          {label}
        </span>
      ),
    },
    {
      title: "趋势",
      key: "trend",
      width: 190,
      render: (_: unknown, metric: PeriodMetricDefinition) => {
        const values = periods.map((period) => period.metrics[metric.key]);
        const mean = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
        const formattedMean = ["deliveries", "contacted", "deals"].includes(metric.key)
          ? Math.round(mean).toLocaleString() : formatMetric(mean, metric.format);
        return <div className="period-sparkline"><ReactECharts style={{ width: 174, height: 68 }} notMerge option={{
          animation: false,
          grid: { left: 8, right: 8, top: 18, bottom: 6 },
          xAxis: { type: "category", show: false, data: periods.map((period) => period.label) },
          yAxis: { type: "value", show: false, scale: true },
          tooltip: { trigger: "axis", valueFormatter: (value: number) => formatMetric(value, metric.format) },
          series: [{
            type: "line", data: values, smooth: true, symbolSize: 5,
            lineStyle: { color: "#1677ff", width: 1.5 }, itemStyle: { color: "#1677ff" },
            label: { show: true, position: "top", fontSize: 9, color: "#595959", formatter: ({ value }: { value: number }) => formatMetric(value, metric.format) },
            markLine: { silent: true, symbol: "none", lineStyle: { color: "#8c8c8c", type: "dashed" },
              label: { show: true, position: "insideEndTop", fontSize: 9, formatter: `均值 ${formattedMean}` }, data: [{ yAxis: mean }] },
          }],
        }} /></div>;
      },
    },
    ...periods.map((period) => ({
      title: (
        <div className="period-column-title">
          <strong>{period.label}</strong>
          <span>{period.start_date.slice(5)} 至 {period.end_date.slice(5)} · {period.day_count}天</span>
        </div>
      ),
      key: period.key,
      width: 116,
      align: "right" as const,
      render: (_: unknown, metric: PeriodMetricDefinition) => (
        <div className="period-value">
          <strong>{formatMetric(period.metrics[metric.key], metric.format)}</strong>
          <ChangeValue value={period.changes[metric.key]} />
        </div>
      ),
    })),
  ], [periods]);

  return (
    <Table
      rowKey="key"
      className="period-comparison-table"
      columns={columns}
      dataSource={PERIOD_METRICS}
      loading={loading}
      pagination={false}
      size="small"
      bordered
      scroll={{ x: 332 + periods.length * 116 }}
      rowClassName={(record) => record.tone === "series-ratio" ? "series-ratio-row" : ""}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该周期暂无数据" /> }}
    />
  );
}

function ScorePanel({ data }: { data: StoreAnalysisData["score"] }) {
  const radarOption = {
    tooltip: { show: false },
    radar: {
      radius: "64%",
      indicator: data.dimensions.map((item) => ({ name: item.label, max: 100 })),
      axisName: { color: "#595959", fontSize: 12 },
      splitNumber: 4,
      splitArea: { areaStyle: { color: ["#fafafa", "#fff"] } },
      splitLine: { lineStyle: { color: "#e8e8e8" } },
      axisLine: { lineStyle: { color: "#e8e8e8" } },
    },
    series: [{
      type: "radar",
      silent: true,
      symbol: "none",
      lineStyle: { color: "#bfbfbf", type: "dashed" },
      areaStyle: { color: "rgba(22,119,255,0.03)" },
      data: [{ value: data.dimensions.map((item) => item.score ?? 0) }],
    }],
  };

  return (
    <Card title="门店评分" extra={<Tag>评分模型待接入</Tag>}>
      <div className="score-layout">
        <div className="score-total">
          <span>综合评分</span>
          <strong>{data.total_score ?? "--"}</strong>
          <small>满分 100</small>
        </div>
        <ReactECharts option={radarOption} style={{ height: 320, width: "100%" }} notMerge />
      </div>
    </Card>
  );
}

const SALESPERSON_TREND_OPTIONS: { label: string; value: SalespersonTrendMetricKey; format: "number" | "percent" | "currency" }[] = [
  { label: "交付数", value: "deliveries", format: "number" }, { label: "触客数", value: "contacted", format: "number" },
  { label: "成交数", value: "deals", format: "number" }, { label: "销售额", value: "total_revenue", format: "currency" },
  { label: "交付数 MA7", value: "deliveries_ma7", format: "number" }, { label: "触客数 MA7", value: "contacted_ma7", format: "number" },
  { label: "成交数 MA7", value: "deals_ma7", format: "number" },
  { label: "触客率", value: "contact_rate", format: "percent" }, { label: "触客渗透率", value: "contact_penetration", format: "percent" },
  { label: "触客率 MA7", value: "contact_rate_ma7", format: "percent" },
  { label: "触客渗透率 MA7", value: "contact_penetration_ma7", format: "percent" },
  { label: "交付渗透率", value: "delivery_penetration", format: "percent" },
  { label: "客单价", value: "avg_deal_amount", format: "currency" },
  { label: "无忧5年期占比", value: "wuyou_five_year_ratio", format: "percent" },
];

function buildSalespersonTrendChart(
  trend: SalespersonTrendItem[], people: string[], metric: SalespersonTrendMetricKey,
) {
  const definition = SALESPERSON_TREND_OPTIONS.find((item) => item.value === metric)!;
  const days = [...new Set(trend.map((item) => item.day))];
  const valueMap = new Map(trend.map((item) => [`${item.salesperson}\u0000${item.day}`, item[metric]]));
  return {
    tooltip: { trigger: "axis", valueFormatter: (value: number) => definition.format === "percent" ? formatPercent(value, 1) : definition.format === "currency" ? formatCurrency(value) : value.toLocaleString() },
    legend: { type: "scroll", top: 0, data: people },
    grid: { left: 52, right: 24, top: 44, bottom: 64, containLabel: true },
    xAxis: { type: "category", data: days, axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: { type: "value", scale: true, axisLabel: { formatter: (value: number) => definition.format === "percent" ? `${Math.round(value * 100)}%` : definition.format === "currency" ? `${Math.round(value / 10000)}w` : value } },
    dataZoom: [{ type: "inside", start: 0, end: 100 }, { type: "slider", height: 18, bottom: 8 }],
    series: people.map((person) => ({ name: person, type: "line", showSymbol: false, smooth: metric.endsWith("ma7"), data: days.map((day) => valueMap.get(`${person}\u0000${day}`) ?? 0) })),
  };
}

function SalespersonMetricSelector({ value, onChange }: { value: SalespersonTrendMetricKey[]; onChange: (value: SalespersonTrendMetricKey[]) => void }) {
  const rows: Array<{ label: string; normal?: SalespersonTrendMetricKey; ma7?: SalespersonTrendMetricKey }> = [
    { label: "交付数", normal: "deliveries", ma7: "deliveries_ma7" },
    { label: "触客数", normal: "contacted", ma7: "contacted_ma7" },
    { label: "成交数", normal: "deals", ma7: "deals_ma7" },
    { label: "触客率", normal: "contact_rate", ma7: "contact_rate_ma7" },
    { label: "触客渗透率", normal: "contact_penetration", ma7: "contact_penetration_ma7" },
    { label: "交付渗透率", normal: "delivery_penetration" },
    { label: "销售额", normal: "total_revenue" },
    { label: "客单价", normal: "avg_deal_amount" },
    { label: "无忧5年期占比", normal: "wuyou_five_year_ratio" },
  ];
  const toggle = (metric: SalespersonTrendMetricKey, checked: boolean) => onChange(checked ? [...new Set([...value, metric])] : value.filter((item) => item !== metric));
  return <Popover trigger="click" placement="bottomRight" content={<div className="scale-metric-grid">
    <div className="metric-grid-actions"><Button size="small" type="link" onClick={() => onChange(SALESPERSON_TREND_OPTIONS.map((item) => item.value))}>全选</Button><Button size="small" type="link" onClick={() => onChange([])}>清除</Button></div>
    <strong>指标</strong><strong>正常值</strong><strong>MA7</strong>
    {rows.flatMap((row) => [<span key={`${row.label}-label`}>{row.label}</span>,
      row.normal ? <Checkbox key={`${row.label}-normal`} checked={value.includes(row.normal)} onChange={(event) => toggle(row.normal!, event.target.checked)} /> : <span key={`${row.label}-normal`}>-</span>,
      row.ma7 ? <Checkbox key={`${row.label}-ma7`} checked={value.includes(row.ma7)} onChange={(event) => toggle(row.ma7!, event.target.checked)} /> : <span key={`${row.label}-ma7`}>-</span>])}
  </div>}><Button size="small">经营指标 {value.length}</Button></Popover>;
}

function HeatValue({ value, benchmark, format }: { value: number; benchmark: number; format: "percent" | "currency" }) {
  const delta = value - benchmark;
  const scale = format === "percent" ? 0.15 : Math.max(Math.abs(benchmark) * 0.35, 1);
  const strength = Math.min(Math.abs(delta) / scale, 1);
  const background = delta === 0 ? "transparent" : delta > 0
    ? `rgba(82, 196, 26, ${0.10 + strength * 0.28})`
    : `rgba(255, 77, 79, ${0.10 + strength * 0.28})`;
  return <span className="heat-value" style={{ background }}>{format === "percent" ? formatPercent(value, 1) : formatCurrency(value)}</span>;
}

function buildSalespersonColumns(summary: SalespersonStoreMetrics): ColumnsType<SalespersonStoreMetrics> { return [
  { title: "销售员", dataIndex: "salesperson", key: "salesperson", fixed: "left", width: 130, sorter: (a, b) => a.salesperson.localeCompare(b.salesperson, "zh-CN") },
  { title: "首次录客日期", dataIndex: "first_record_date", key: "first_record_date", width: 125, sorter: (a, b) => (a.first_record_date || "").localeCompare(b.first_record_date || "") },
  { title: "交付数", dataIndex: "deliveries", key: "deliveries", width: 90, align: "right", sorter: (a, b) => a.deliveries - b.deliveries },
  { title: "触客数", dataIndex: "contacted", key: "contacted", width: 90, align: "right", sorter: (a, b) => a.contacted - b.contacted },
  { title: "成交数", dataIndex: "deals", key: "deals", width: 90, align: "right", sorter: (a, b) => a.deals - b.deals },
  { title: "触客渗透率", dataIndex: "contact_penetration", key: "contact_penetration", width: 120, align: "right", sorter: (a, b) => a.contact_penetration - b.contact_penetration, render: (value: number) => <HeatValue value={value} benchmark={summary.contact_penetration} format="percent" /> },
  { title: "客单价", dataIndex: "avg_deal_amount", key: "avg_deal_amount", width: 120, align: "right", sorter: (a, b) => a.avg_deal_amount - b.avg_deal_amount, render: (value: number) => <HeatValue value={value} benchmark={summary.avg_deal_amount} format="currency" /> },
  { title: "无忧5年期占比", dataIndex: "wuyou_five_year_ratio", key: "wuyou_five_year_ratio", width: 130, align: "right", sorter: (a, b) => a.wuyou_five_year_ratio - b.wuyou_five_year_ratio, render: (value: number) => <HeatValue value={value} benchmark={summary.wuyou_five_year_ratio} format="percent" /> },
  ...SERIES_COLUMNS.map((series) => ({
    title: series.label,
    children: [
      {
        title: "触客贡献",
        key: `${series.key}-share`,
        width: 105,
        align: "right" as const,
        sorter: (a: SalespersonStoreMetrics, b: SalespersonStoreMetrics) => a[series.key].contact_share - b[series.key].contact_share,
        render: (_: unknown, record: SalespersonStoreMetrics) => <HeatValue value={record[series.key].contact_share} benchmark={summary[series.key].contact_share} format="percent" />,
      },
      {
        title: "触客渗透率",
        key: `${series.key}-penetration`,
        width: 115,
        align: "right" as const,
        sorter: (a: SalespersonStoreMetrics, b: SalespersonStoreMetrics) => a[series.key].contact_penetration - b[series.key].contact_penetration,
        render: (_: unknown, record: SalespersonStoreMetrics) => <HeatValue value={record[series.key].contact_penetration} benchmark={summary[series.key].contact_penetration} format="percent" />,
      },
    ],
  })),
] };

export default function StoreAnalysisPage() {
  const cachedState = (() => { try { return JSON.parse(sessionStorage.getItem("cgj-store-analysis-state-v1") || "{}"); } catch { return {}; } })();
  const [storeName, setStoreName] = useState<string | undefined>(cachedState.storeName);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(cachedState.startDate && cachedState.endDate ? [dayjs(cachedState.startDate), dayjs(cachedState.endDate)] : null);
  const [storeKeyword, setStoreKeyword] = useState("");
  const debouncedKeyword = useDebounce(storeKeyword, 250);
  const [storeOptions, setStoreOptions] = useState<string[]>([]);
  const [storeOptionsLoading, setStoreOptionsLoading] = useState(false);
  const [periodMode, setPeriodMode] = useState<"month" | "week">(cachedState.periodMode || "month");
  const [salespersonMetrics, setSalespersonMetrics] = useState<SalespersonTrendMetricKey[]>(cachedState.salespersonMetrics || ["contact_penetration", "contact_penetration_ma7"]);
  const [selectedSalespeople, setSelectedSalespeople] = useState<string[]>(cachedState.selectedSalespeople || []);
  const [data, setData] = useState<StoreAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const startDate = dateRange?.[0].format("YYYY-MM-DD");
  const endDate = dateRange?.[1].format("YYYY-MM-DD");

  useEffect(() => {
    sessionStorage.setItem("cgj-store-analysis-state-v1", JSON.stringify({ storeName, startDate, endDate, periodMode, salespersonMetrics, selectedSalespeople }));
  }, [storeName, startDate, endDate, periodMode, salespersonMetrics, selectedSalespeople]);

  useEffect(() => {
    let cancelled = false;
    setStoreOptionsLoading(true);
    searchStores(debouncedKeyword)
      .then((stores) => {
        if (!cancelled) setStoreOptions(stores);
      })
      .finally(() => {
        if (!cancelled) setStoreOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedKeyword]);

  useEffect(() => {
    if (!storeName || !startDate || !endDate) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(undefined);
    const storeFilter = [{ field: "merchant_name", operator: "in", value: [storeName] }];

    Promise.all([
      getStoreScore(storeName, startDate, endDate),
      getStorePeriodComparison(storeName, endDate, "month"),
      getStorePeriodComparison(storeName, endDate, "week"),
      getOverview(storeFilter, "AND", startDate, endDate),
      getStoreSalespeople(storeName, startDate, endDate),
    ])
      .then(([score, monthly, weekly, overview, salespeople]) => {
        if (!cancelled) {
          setData({ score, monthly, weekly, overview, salespeople });
          setSelectedSalespeople((current) => current.length > 0 ? current.filter((name) => salespeople.items.some((item) => item.salesperson === name)) :
            [...salespeople.items].sort((a, b) => b.contacted - a.contacted).slice(0, 5).map((item) => item.salesperson));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError("门店分析数据加载失败，请确认服务已启动后重试");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storeName, startDate, endDate]);

  const selectedPeriods = periodMode === "month" ? data?.monthly.periods : data?.weekly.periods;
  const ready = Boolean(storeName && startDate && endDate);
  const salespersonTrendPanel = data ? (
    <Card title="销售员经营趋势" style={{ marginTop: 16 }} extra={
      <div className="salesperson-trend-controls">
        <Select mode="multiple" size="small" value={selectedSalespeople} maxTagCount="responsive"
          onChange={setSelectedSalespeople}
          options={data.salespeople.items.map((item) => ({ label: item.salesperson, value: item.salesperson }))}
          placeholder="选择销售员" style={{ width: 300 }} />
        <div className="salesperson-quick-actions"><Button size="small" type="link" onClick={() => setSelectedSalespeople(data.salespeople.items.map((item) => item.salesperson))}>全选人员</Button><Button size="small" type="link" onClick={() => setSelectedSalespeople([])}>清除人员</Button></div>
        <SalespersonMetricSelector value={salespersonMetrics} onChange={setSalespersonMetrics} />
      </div>
    }>
      {data.salespeople.items.length > 0 && selectedSalespeople.length > 0 && salespersonMetrics.length > 0 ? <div className="salesperson-trend-grid">
        {salespersonMetrics.map((metric) => <section key={metric} className="salesperson-trend-chart">
          <h3>{SALESPERSON_TREND_OPTIONS.find((item) => item.value === metric)?.label}</h3>
          <ReactECharts option={buildSalespersonTrendChart(data.salespeople.trend, selectedSalespeople, metric)} style={{ height: 330 }} notMerge />
        </section>)}
      </div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择销售员和经营指标" />}
    </Card>
  ) : null;

  return (
    <div className="store-analysis-page">
      <div className="store-analysis-heading store-analysis-sticky-toolbar">
        <div>
          <h1>门店分析</h1>
          {storeName ? <span>{storeName}</span> : null}
        </div>
        <div className="store-analysis-toolbar">
          <Select
            showSearch
            allowClear
            value={storeName}
            options={storeOptions.map((store) => ({ label: store, value: store }))}
            loading={storeOptionsLoading}
            filterOption={false}
            onSearch={setStoreKeyword}
            onChange={setStoreName}
            placeholder="搜索并选择门店"
            suffixIcon={<ShopOutlined />}
            notFoundContent={storeOptionsLoading ? <Spin size="small" /> : "未找到门店"}
            style={{ width: 320, maxWidth: "100%" }}
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates?.[0] && dates?.[1] ? [dates[0], dates[1]] : null)}
            placeholder={["交付开始日期", "交付结束日期"]}
            style={{ width: 280, maxWidth: "100%" }}
          />
        </div>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      {!ready ? (
        <div className="store-analysis-empty">
          <Empty description="请选择门店和交付日期范围" />
        </div>
      ) : loading && !data ? (
        <Spin size="large" style={{ display: "block", margin: "120px auto" }} />
      ) : data ? (
        <div className={loading ? "store-analysis-content is-refreshing" : "store-analysis-content"}>
          <ScorePanel data={data.score} />

          <Card
            title="经营周期对比"
            extra={
              <Segmented
                value={periodMode}
                onChange={(value) => setPeriodMode(value as "month" | "week")}
                options={[{ label: "月度", value: "month" }, { label: "周度", value: "week" }]}
              />
            }
          >
            <PeriodComparisonTable periods={selectedPeriods || []} loading={loading} />
          </Card>

          <section className="store-overview-section">
            <div className="section-heading">
              <h2>周期经营透视</h2>
              <span>{startDate} 至 {endDate}</span>
            </div>
            <DashboardOverviewContent data={data.overview} betweenTrends={salespersonTrendPanel} cacheKey="store-analysis" />
          </section>

          <Card title="销售员经营明细">
            <SalespersonMetricsTable items={data.salespeople.items} summary={data.salespeople.summary} />
          </Card>
        </div>
      ) : null}
    </div>
  );
}
