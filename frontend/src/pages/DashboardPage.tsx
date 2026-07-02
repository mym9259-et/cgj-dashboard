import { useEffect, useState } from "react";
import { Card, Empty, Segmented, Spin } from "antd";
import { getOverview } from "../api/dashboard";
import { DashboardOverviewContent } from "../components/dashboard/DashboardOverviewContent";
import { useDebounce } from "../hooks/useDebounce";
import { useFilterStore } from "../stores/filterStore";
import type { DashboardOverview } from "../types/dashboard";
import type { StorePeriodComparison } from "../types/storeAnalysis";
import { getScopePeriodComparison } from "../api/storeAnalysis";
import { PeriodComparisonTable } from "./StoreAnalysisPage";

export default function DashboardPage() {
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const debouncedFilters = useDebounce(filters, 300);
  const debouncedLogic = useDebounce(filterLogic, 300);
  const debouncedStartDate = useDebounce(startDate, 300);
  const debouncedEndDate = useDebounce(endDate, 300);
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodMode, setPeriodMode] = useState<"month" | "week">("month");
  const [periods, setPeriods] = useState<{ month: StorePeriodComparison | null; week: StorePeriodComparison | null }>({ month: null, week: null });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getOverview(debouncedFilters, debouncedLogic, debouncedStartDate, debouncedEndDate),
      getScopePeriodComparison(debouncedFilters, debouncedLogic, debouncedEndDate, "month"),
      getScopePeriodComparison(debouncedFilters, debouncedLogic, debouncedEndDate, "week"),
    ])
      .then(([result, month, week]) => {
        if (!cancelled) { setData(result); setPeriods({ month, week }); }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedFilters, debouncedLogic, debouncedStartDate, debouncedEndDate]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  if (!data) return <Empty description="暂无数据，请先上传数据文件" />;

  const periodPanel = <Card title="经营周期对比" style={{ marginTop: 16 }} extra={<Segmented value={periodMode} onChange={(value) => setPeriodMode(value as "month" | "week")} options={[{ label: "月度", value: "month" }, { label: "周度", value: "week" }]} />}>
    <PeriodComparisonTable periods={periods[periodMode]?.periods || []} loading={loading} />
  </Card>;
  return <DashboardOverviewContent data={data} beforeTrends={periodPanel} />;
}
