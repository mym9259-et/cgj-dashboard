import unittest
from datetime import date
from types import SimpleNamespace

from sqlalchemy import select

from app.models.lead import Lead
from app.services.dashboard_service import TREND_SERIES_GROUPS, _build_where_clauses, apply_moving_metrics, get_kpi_data


class ScalarSession:
    def __init__(self, values, series_row):
        self._values = iter(values)
        self._series_row = SimpleNamespace(**series_row)

    async def scalar(self, _statement):
        return next(self._values)

    async def execute(self, _statement):
        return SimpleNamespace(one=lambda: self._series_row)


class DashboardServiceTest(unittest.IsolatedAsyncioTestCase):
    def test_series_ma7_is_weighted_by_delivery_volume(self):
        daily = []
        for leads, a_count in ((1, 1), (9, 0)):
            item = {"leads": leads, "contacted": leads, "deals": 0}
            for key in TREND_SERIES_GROUPS:
                item[f"{key}_count"] = a_count if key == "a_series" else 0
                item[f"{key}_contacted"] = 0
                item[f"{key}_deals"] = 0
            daily.append(item)

        apply_moving_metrics(daily)

        self.assertEqual(daily[-1]["a_series_ratio_ma7"], 0.1)
        self.assertEqual(daily[-1]["leads_ma7"], 5.0)
        self.assertEqual(daily[-1]["contacted_ma7"], 5.0)
        self.assertEqual(daily[-1]["deals_ma7"], 0.0)
        self.assertEqual(daily[-1]["contact_rate_ma7"], 1.0)

    def test_global_date_range_filters_delivery_date(self):
        clauses, _ = _build_where_clauses(
            None,
            "AND",
            date(2026, 6, 1),
            date(2026, 6, 18),
        )

        sql = str(select(Lead.id).where(*clauses))
        self.assertIn("leads.delivery_date", sql)
        self.assertNotIn("leads.create_time", sql)

    async def test_kpis_include_five_year_metrics_when_data_exists(self):
        db = ScalarSession(
            [10, 8, 5, 5000, 1, 100, 3, 4, 2],
            {
                "a_series_count": 2, "a_series_contacted": 2, "a_series_deals": 1,
                "b_series_count": 3, "b_series_contacted": 2, "b_series_deals": 1,
                "c_series_count": 4, "c_series_contacted": 4, "c_series_deals": 3,
                "d_series_count": 1, "d_series_contacted": 1, "d_series_deals": 0,
                "lafa_series_count": 2, "lafa_series_contacted": 2, "lafa_series_deals": 1,
                "other_series_count": 1, "other_series_contacted": 0, "other_series_deals": 0,
            },
        )

        result = await get_kpi_data(db)

        self.assertEqual(result["total_leads"], 10)
        self.assertEqual(result["five_year_deals"], 3)
        self.assertEqual(result["five_year_ratio"], 0.6)
        self.assertEqual(result["wuyou_five_year_ratio"], 0.5)
        self.assertEqual(result["refund_rate"], 0.1667)
        self.assertEqual(result["a_series_count"], 2)
        self.assertEqual(result["a_series_ratio"], 0.2)
        self.assertEqual(result["a_series_contact_penetration"], 0.5)
        self.assertEqual(result["c_series_count"], 4)
        self.assertEqual(result["c_series_contact_penetration"], 0.75)
        self.assertEqual(result["other_series_ratio"], 0.1)
        self.assertEqual(result["other_series_contact_penetration"], 0.0)


if __name__ == "__main__":
    unittest.main()
