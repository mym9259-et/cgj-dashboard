import { useEffect, useMemo, useState } from "react";
import { Button, Calendar, Card, DatePicker, Descriptions, Empty, Segmented, Select, Spin, Table, Tag, Tooltip } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useSearchParams } from "react-router-dom";
import { getPersonDetail, searchPeople } from "../api/storeAnalysis";
import { DashboardOverviewContent } from "../components/dashboard/DashboardOverviewContent";
import { PeriodComparisonTable } from "./StoreAnalysisPage";
import { formatCurrency, formatPercent } from "../utils/formatters";
import { useDebounce } from "../hooks/useDebounce";

const { RangePicker } = DatePicker;
const STORE_COLORS = ["#1677ff", "#13a8a8", "#722ed1", "#d48806", "#cf1322", "#389e0d", "#08979c", "#c41d7f"];
function colorFor(value: string) { let hash = 0; for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0; return STORE_COLORS[hash % STORE_COLORS.length]; }

export default function IndividualAnalysisPage() {
  const [params] = useSearchParams();
  const [name, setName] = useState<string | undefined>(params.get("name") || undefined);
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 250);
  const [options, setOptions] = useState<string[]>([]);
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(2, "month").startOf("month"), dayjs()]);
  const [mode, setMode] = useState<"month" | "week">("month");
  const [calendarValue, setCalendarValue] = useState<Dayjs>(dayjs());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { searchPeople(debouncedKeyword).then(setOptions); }, [debouncedKeyword]);
  useEffect(() => {
    if (!name) { setData(null); return; }
    setLoading(true);
    getPersonDetail(name, range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD")).then(setData).finally(() => setLoading(false));
  }, [name, range[0].valueOf(), range[1].valueOf()]);
  const byDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const item of data?.calendar || []) map.set(item.day, [...(map.get(item.day) || []), item]);
    return map;
  }, [data]);
  const dayContext = useMemo(() => Object.fromEntries([...byDay.entries()].map(([day, rows]) => [day, rows.map((row) => row.store_name)])), [byDay]);

  return <div className="individual-analysis-page">
    <div className="individual-toolbar">
      <Select showSearch value={name} filterOption={false} onSearch={setKeyword} onChange={setName} options={options.map((value) => ({ label: value, value }))} placeholder="搜索并选择人员姓名" style={{ width: 300 }} />
      <RangePicker value={range} onChange={(dates) => { if (dates?.[0] && dates?.[1]) { setRange([dates[0], dates[1]]); setCalendarValue(dates[1]); } }} placeholder={["交付开始日期", "交付结束日期"]} />
    </div>
    {!name ? <Empty description="请选择人员和日期范围" /> : loading && !data ? <Spin size="large" style={{ display: "block", margin: "100px auto" }} /> : data ? <>
      <Card title="人员信息概览">
        <Descriptions column={{ xs: 1, md: 3 }} items={[
          { key: "name", label: "人员姓名", children: data.salesperson },
          { key: "active", label: "在职状态", children: data.is_active == null ? <Tag>未映射</Tag> : <Tag color={data.is_active ? "green" : "default"}>{data.is_active ? "在职" : "离职"}</Tag> },
          { key: "role", label: "角色", children: data.role || "未映射" },
          { key: "rating", label: "评级", children: "待接入" },
          { key: "recent", label: "最近记录门店", children: data.recent_stores.join("、") || "--" },
          { key: "stores", label: "周期内门店", children: `${data.stores.length} 家` },
        ]} />
        <Table rowKey="store_name" size="small" pagination={false} dataSource={data.stores} columns={[
          { title: "门店", dataIndex: "store_name" },
          { title: "触客数", dataIndex: "contacted", align: "right" },
          { title: "触客渗透率", dataIndex: "contact_penetration", align: "right", render: (value) => formatPercent(value, 1) },
        ]} />
        <div className="person-period-overview-title">周期经营透视</div>
        <DashboardOverviewContent data={data.overview} cacheKey={`person-kpi-${name}`} showTrends={false} />
      </Card>
      <Card title="人员活动月历" style={{ marginTop: 16 }}><Calendar value={calendarValue} onChange={setCalendarValue} headerRender={({ value, onChange }) => <div className="person-calendar-header">
        <Button icon={<LeftOutlined />} onClick={() => { const next = value.subtract(1, "month"); onChange(next); setCalendarValue(next); }} title="上一月" />
        <strong>{value.format("YYYY年MM月")}</strong>
        <Button icon={<RightOutlined />} onClick={() => { const next = value.add(1, "month"); onChange(next); setCalendarValue(next); }} title="下一月" />
      </div>} cellRender={(current, info) => {
        if (info.type !== "date") return info.originNode;
        const entries = byDay.get(current.format("YYYY-MM-DD")) || [];
        const totals = entries.reduce((sum, item) => ({ deliveries: sum.deliveries + item.deliveries, contacted: sum.contacted + item.contacted, deals: sum.deals + item.deals, revenue: sum.revenue + item.revenue }), { deliveries: 0, contacted: 0, deals: 0, revenue: 0 });
        return <Tooltip title={entries.length ? <div>{entries.map((entry) => <div key={entry.store_name}><strong>{entry.store_name}</strong><br />交付 {entry.deliveries} · 触客 {entry.contacted} · 成交 {entry.deals} · {formatCurrency(entry.revenue)}</div>)}</div> : "无记录"}><div className={`person-calendar-cell ${totals.deliveries ? "has-activity" : ""}`}>
          <div className="calendar-store-strips">{entries.map((entry) => <i key={entry.store_name} style={{ background: colorFor(entry.store_name) }} />)}</div>
          {entries.length ? <small>交 {totals.deliveries}　触 {totals.contacted}　成 {totals.deals}</small> : null}
        </div></Tooltip>;
      }} /></Card>
      <Card title="个人经营数据对比" style={{ marginTop: 16 }} extra={<Segmented value={mode} onChange={(value) => setMode(value as "month" | "week")} options={[{ label: "月度", value: "month" }, { label: "周度", value: "week" }]} />}>
        <PeriodComparisonTable periods={data[mode === "month" ? "monthly" : "weekly"].periods} loading={loading} />
      </Card>
      <div className="individual-trends"><DashboardOverviewContent data={data.overview} cacheKey={`person-${name}`} dayContext={dayContext} showKpis={false} /></div>
    </> : null}
  </div>;
}
