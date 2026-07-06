import { useEffect, useMemo, useState } from "react";
import { Card, Empty, message, Spin } from "antd";
import { getPeopleAnalysis } from "../api/storeAnalysis";
import { SalespersonMetricsTable } from "../components/analysis/SalespersonMetricsTable";
import { useDebounce } from "../hooks/useDebounce";
import { useFilterStore } from "../stores/filterStore";
import type { PeopleAnalysisData } from "../types/storeAnalysis";
import { useNavigate } from "react-router-dom";

const CACHE_PREFIX = "cgj-page-people-analysis-v1:";

export default function PeopleAnalysisPage() {
  const navigate = useNavigate();
  const { filters, filterLogic, startDate, endDate } = useFilterStore();
  const debouncedFilters = useDebounce(filters, 300);
  const debouncedLogic = useDebounce(filterLogic, 300);
  const debouncedStart = useDebounce(startDate, 300);
  const debouncedEnd = useDebounce(endDate, 300);
  const cacheKey = useMemo(() => CACHE_PREFIX + JSON.stringify({
    filters: debouncedFilters, filterLogic: debouncedLogic,
    startDate: debouncedStart, endDate: debouncedEnd,
  }), [debouncedFilters, debouncedLogic, debouncedStart, debouncedEnd]);
  const [data, setData] = useState<PeopleAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const detailQuery = (extra: Record<string, string>) => {
    const params = new URLSearchParams(extra);
    if (debouncedStart) params.set("start_date", debouncedStart);
    if (debouncedEnd) params.set("end_date", debouncedEnd);
    return params.toString();
  };

  useEffect(() => {
    let cancelled = false;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { setData(JSON.parse(cached)); } catch { sessionStorage.removeItem(cacheKey); }
    }
    setLoading(!cached);
    getPeopleAnalysis(debouncedFilters, debouncedLogic, debouncedStart, debouncedEnd)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        }
      })
      .catch(() => { if (!cancelled) message.error("人员分析数据加载失败"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cacheKey, debouncedFilters, debouncedLogic, debouncedStart, debouncedEnd]);

  return <div className="people-analysis-page">
    <div className="page-heading">
      <h1>人员分析</h1>
      <span>共 {data?.items.length || 0} 名销售员</span>
    </div>
    <Card title="销售员经营明细">
      {loading && !data ? <Spin size="large" style={{ display: "block", margin: "80px auto" }} />
        : data && data.items.length ? <SalespersonMetricsTable items={data.items} summary={data.summary}
            showStores showLastRecordDate
            onPersonClick={(name) => navigate(`/people-analysis/individual?${detailQuery({ name })}`)}
            onStoreClick={(store) => navigate(`/store-analysis?${detailQuery({ store })}`)} />
        : <Empty description="当前筛选范围内暂无销售员数据" />}
    </Card>
  </div>;
}
