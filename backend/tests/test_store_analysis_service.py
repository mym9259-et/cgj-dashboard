import unittest
from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from app.services.store_analysis_service import (
    build_periods,
    accumulate_period_rows,
    calculate_changes,
    calculate_period_metrics,
)


class StoreAnalysisServiceTest(unittest.TestCase):
    def test_month_periods_use_calendar_days_and_mtd(self):
        periods = build_periods("month", date(2026, 6, 18), date(2026, 1, 10))

        self.assertEqual(len(periods), 7)
        self.assertEqual(periods[-1]["label"], "2026年6月 MTD")
        self.assertEqual(periods[-1]["day_count"], 18)
        self.assertEqual(periods[-2]["day_count"], 31)

    def test_month_periods_trim_before_first_data_month(self):
        periods = build_periods("month", date(2026, 6, 18), date(2026, 4, 9))

        self.assertEqual(periods[0]["key"], "2026-03")
        self.assertEqual([period["key"] for period in periods[1:]], ["2026-04", "2026-05", "2026-06"])

    def test_week_periods_are_non_overlapping_rolling_windows(self):
        periods = build_periods("week", date(2026, 6, 18), date(2026, 1, 1))

        self.assertEqual(len(periods), 7)
        self.assertEqual(periods[-1]["start_date"], date(2026, 6, 12))
        self.assertEqual(periods[-1]["end_date"], date(2026, 6, 18))
        self.assertEqual(periods[-2]["end_date"], date(2026, 6, 11))

    def test_period_metrics_include_series_penetration_and_calendar_averages(self):
        raw = {
            "deliveries": 10,
            "contacted": 8,
            "deals": 4,
            "total_revenue": 4000,
            "wuyou_deals": 2,
            "wuyou_five_year_deals": 1,
        }
        for key in ("a_series", "b_series", "c_series", "d_series", "lafa_series"):
            raw[f"{key}_count"] = 2
            raw[f"{key}_contacted"] = 2
            raw[f"{key}_deals"] = 1

        metrics = calculate_period_metrics(raw, 5)

        self.assertEqual(metrics["contact_rate"], 0.8)
        self.assertEqual(metrics["wuyou_five_year_ratio"], 0.5)
        self.assertEqual(metrics["a_series_ratio"], 0.2)
        self.assertEqual(metrics["a_series_contact_penetration"], 0.5)
        self.assertEqual(metrics["avg_daily_deliveries"], 2.0)
        self.assertEqual(metrics["avg_daily_revenue"], 800.0)

    def test_change_is_relative_and_zero_base_is_unavailable(self):
        current = {key: 2 for key in calculate_period_metrics({
            "deliveries": 0,
            "contacted": 0,
            "deals": 0,
            "total_revenue": 0,
            "wuyou_deals": 0,
            "wuyou_five_year_deals": 0,
            **{
                f"{series}_{suffix}": 0
                for series in ("a_series", "b_series", "c_series", "d_series", "lafa_series")
                for suffix in ("count", "contacted", "deals")
            },
        }, 1)}
        previous = {key: 1 for key in current}
        previous["deliveries"] = 0

        changes = calculate_changes(current, previous)

        self.assertIsNone(changes["deliveries"])
        self.assertEqual(changes["contacted"], 1.0)

    def test_daily_revenue_decimal_is_normalized_during_period_accumulation(self):
        row = {
            "day": date(2026, 2, 1),
            "deliveries": 1,
            "contacted": 1,
            "deals": 1,
            "total_revenue": Decimal("99.50"),
            "wuyou_deals": 0,
            "wuyou_five_year_deals": 0,
        }
        for key in ("a_series", "b_series", "c_series", "d_series", "lafa_series"):
            row[f"{key}_count"] = 0
            row[f"{key}_contacted"] = 0
            row[f"{key}_deals"] = 0

        result = accumulate_period_rows(
            [SimpleNamespace(**row)], date(2026, 2, 1), date(2026, 2, 28)
        )

        self.assertEqual(result["total_revenue"], 99.5)


if __name__ == "__main__":
    unittest.main()
