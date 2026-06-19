import unittest

from app.core.constants import STORE_MAPPING_FIELDS
from app.services.store_mapping_service import _build_field_map


class StoreMappingFieldsTest(unittest.TestCase):
    def test_new_excel_columns_are_recognized(self):
        field_map = _build_field_map(["商户名称", "经销商/直营", "模式"])

        self.assertEqual(field_map["经销商/直营"], "dealer_direct")
        self.assertEqual(field_map["模式"], "store_mode")

    def test_new_fields_are_available_to_dashboard_filters(self):
        self.assertEqual(STORE_MAPPING_FIELDS["dealer_direct"], "dealer_direct")
        self.assertEqual(STORE_MAPPING_FIELDS["store_mode"], "store_mode")


if __name__ == "__main__":
    unittest.main()
