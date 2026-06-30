import { useEffect, useState } from "react";
import { Empty, Spin } from "antd";
import { getOverview } from "../api/dashboard";
import { DashboardOverviewContent } from "../components/dashboard/DashboardOverviewContent";
import { useDebounce } from "../hooks/useDebounce";
import { useFilterStore } from "../stores/filterStore";
import type { DashboardOverview } from "../types/dashboard";

export default function DashboardPage() {
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const debouncedFilters = useDebounce(filters, 300);
  const debouncedLogic = useDebounce(filterLogic, 300);
  const debouncedStartDate = useDebounce(startDate, 300);
  const debouncedEndDate = useDebounce(endDate, 300);
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOverview(debouncedFilters, debouncedLogic, debouncedStartDate, debouncedEndDate)
      .then((result) => {
        if (!cancelled) setData(result);
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

  return <DashboardOverviewContent data={data} />;
}
