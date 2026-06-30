import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Card,
  DatePicker,
  Empty,
  Segmented,
  Select,
  Spin,
  Table,
  Tag,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import ReactECharts from "echarts-for-react";
import { getOverview } from "../api/dashboard";
import {
  getStorePeriodComparison,
  getStoreSalespeople,
  getStoreScore,
  searchStores,
} from "../api/storeAnalysis";
import { DashboardOverviewContent } from "../components/dashboard/DashboardOverviewContent";
import { useDebounce } from "../hooks/useDebounce";
import type {
  PeriodMetricKey,
  SalespersonStoreMetrics,
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

function PeriodComparisonTable({ periods, loading }: { periods: StorePeriod[]; loading: boolean }) {
  const columns = useMemo<ColumnsType<PeriodMetricDefinition>>(() => [
    {
      title: "经营指标",
      dataIndex: "label",
      key: "label",
      fixed: "left",
      width: 190,
      render: (label: string, record) => (
        <span className={record.tone === "series-penetration" ? "series-penetration-label" : ""}>
          {label}
        </span>
      ),
    },
    ...periods.map((period) => ({
      title: (
        <div className="period-column-title">
          <strong>{period.label}</strong>
          <span>{period.start_date.slice(5)} 至 {period.end_date.slice(5)} · {period.day_count}天</span>
        </div>
      ),
      key: period.key,
      width: 150,
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
      scroll={{ x: 190 + periods.length * 150 }}
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

function buildSalespersonChart(items: SalespersonStoreMetrics[]) {
  const chartItems = [...items].reverse();
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        return `${item.name}<br/>触客渗透率：${formatPercent(item.value, 1)}`;
      },
    },
    grid: { left: 24, right: 42, top: 12, bottom: 24, containLabel: true },
    xAxis: {
      type: "value",
      min: 0,
      axisLabel: { formatter: (value: number) => `${Math.round(value * 100)}%` },
      splitLine: { lineStyle: { color: "#f0f0f0" } },
    },
    yAxis: {
      type: "category",
      data: chartItems.map((item) => item.salesperson),
      axisLabel: { width: 120, overflow: "truncate" },
    },
    series: [{
      type: "bar",
      data: chartItems.map((item) => item.contact_penetration),
      barMaxWidth: 22,
      itemStyle: { color: "#1677ff", borderRadius: [0, 3, 3, 0] },
      label: {
        show: true,
        position: "right",
        formatter: (params: any) => formatPercent(params.value, 1),
        color: "#595959",
      },
    }],
  };
}

const salespersonColumns: ColumnsType<SalespersonStoreMetrics> = [
  { title: "销售员", dataIndex: "salesperson", key: "salesperson", fixed: "left", width: 130 },
  { title: "交付数", dataIndex: "deliveries", key: "deliveries", width: 90, align: "right" },
  { title: "触客数", dataIndex: "contacted", key: "contacted", width: 90, align: "right" },
  { title: "成交数", dataIndex: "deals", key: "deals", width: 90, align: "right" },
  { title: "触客渗透率", dataIndex: "contact_penetration", key: "contact_penetration", width: 120, align: "right", render: (value: number) => formatPercent(value, 1) },
  { title: "客单价", dataIndex: "avg_deal_amount", key: "avg_deal_amount", width: 120, align: "right", render: (value: number) => formatCurrency(value) },
  { title: "无忧5年期占比", dataIndex: "wuyou_five_year_ratio", key: "wuyou_five_year_ratio", width: 130, align: "right", render: (value: number) => formatPercent(value, 1) },
  ...SERIES_COLUMNS.map((series) => ({
    title: series.label,
    children: [
      {
        title: "触客贡献",
        key: `${series.key}-share`,
        width: 105,
        align: "right" as const,
        render: (_: unknown, record: SalespersonStoreMetrics) => formatPercent(record[series.key].contact_share, 1),
      },
      {
        title: "触客渗透率",
        key: `${series.key}-penetration`,
        width: 115,
        align: "right" as const,
        render: (_: unknown, record: SalespersonStoreMetrics) => formatPercent(record[series.key].contact_penetration, 1),
      },
    ],
  })),
];

export default function StoreAnalysisPage() {
  const [storeName, setStoreName] = useState<string>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [storeKeyword, setStoreKeyword] = useState("");
  const debouncedKeyword = useDebounce(storeKeyword, 250);
  const [storeOptions, setStoreOptions] = useState<string[]>([]);
  const [storeOptionsLoading, setStoreOptionsLoading] = useState(false);
  const [periodMode, setPeriodMode] = useState<"month" | "week">("month");
  const [data, setData] = useState<StoreAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const startDate = dateRange?.[0].format("YYYY-MM-DD");
  const endDate = dateRange?.[1].format("YYYY-MM-DD");

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
        if (!cancelled) setData({ score, monthly, weekly, overview, salespeople });
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

  return (
    <div className="store-analysis-page">
      <div className="store-analysis-heading">
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
            <DashboardOverviewContent data={data.overview} />
          </section>

          <Card title="销售员触客渗透率">
            {data.salespeople.items.length > 0 ? (
              <ReactECharts
                option={buildSalespersonChart(data.salespeople.items)}
                style={{ height: Math.max(320, data.salespeople.items.length * 38 + 60) }}
                notMerge
              />
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该周期暂无销售员记录" />}
          </Card>

          <Card title="销售员经营明细">
            <Table
              rowKey="salesperson"
              columns={salespersonColumns}
              dataSource={data.salespeople.items}
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 1810 }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该周期暂无销售员记录" /> }}
            />
          </Card>
        </div>
      ) : null}
    </div>
  );
}
