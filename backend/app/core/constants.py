"""System standard field definitions with Chinese aliases for fuzzy matching."""

STANDARD_FIELDS: dict[str, dict] = {
    "source_id": {
        "aliases": ["ID", "编号", "序号", "id", "No.", "记录ID"],
        "label": "原始ID",
        "category": "标识",
        "field_type": "text",
    },
    "merchant_name": {
        "aliases": ["商户名称", "门店", "经销商", "merchant", "dealer", "经销店", "商户"],
        "label": "商户名称",
        "category": "商户",
        "field_type": "text",
    },
    "customer_source": {
        "aliases": ["客户来源", "来源", "source", "线索来源", "客户渠道"],
        "label": "客户来源",
        "category": "商户",
        "field_type": "text",
    },
    "delivery_date": {
        "aliases": ["交付日期", "交车日期", "交付时间", "提车日期", "delivery"],
        "label": "交付日期",
        "category": "商户",
        "field_type": "date",
    },
    "referrer": {
        "aliases": ["引荐人", "推荐人", "介绍人", "referrer"],
        "label": "引荐人",
        "category": "销售",
        "field_type": "text",
    },
    "customer_name": {
        "aliases": ["客户名称", "客户姓名", "姓名", "customer", "name", "车主姓名", "车主名称", "客户"],
        "label": "客户名称",
        "category": "客户",
        "field_type": "text",
    },
    "customer_phone": {
        "aliases": ["客户电话", "电话", "手机", "phone", "tel", "联系方式", "联系电话", "手机号", "电话号码"],
        "label": "客户电话",
        "category": "客户",
        "field_type": "text",
    },
    "vin": {
        "aliases": ["车架号", "VIN", "vin", "车辆识别号", "车辆识别码", "车架号码"],
        "label": "车架号",
        "category": "车辆",
        "field_type": "text",
    },
    "brand": {
        "aliases": ["品牌", "brand", "汽车品牌", "车辆品牌", "车型品牌"],
        "label": "品牌",
        "category": "车辆",
        "field_type": "text",
    },
    "model_series": {
        "aliases": ["车系", "车型", "系列", "model", "车辆车系", "车系名称"],
        "label": "车系",
        "category": "车辆",
        "field_type": "text",
    },
    "customer_type": {
        "aliases": ["客户类型", "customer_type", "客户类别"],
        "label": "客户类型",
        "category": "客户",
        "field_type": "text",
    },
    "fuel_type": {
        "aliases": ["燃料类型", "燃油类型", "动力类型", "fuel", "能源类型"],
        "label": "燃料类型",
        "category": "车辆",
        "field_type": "text",
    },
    "is_gifted": {
        "aliases": ["是否赠送礼品", "是否赠礼", "是否赠送", "是否送礼"],
        "label": "是否赠送礼品",
        "category": "其他",
        "field_type": "text",
    },
    "gift_name": {
        "aliases": ["赠送礼品名称", "礼品名称", "赠品", "赠礼名称"],
        "label": "赠送礼品名称",
        "category": "其他",
        "field_type": "text",
    },
    "salesperson": {
        "aliases": ["销售员", "销售", "销售人员", "sales", "销售顾问", "销售代表", "业务员"],
        "label": "销售员",
        "category": "销售",
        "field_type": "text",
    },
    "create_method": {
        "aliases": ["创建方式", "录入方式", "创建途径", "录入途径"],
        "label": "创建方式",
        "category": "销售",
        "field_type": "text",
    },
    "creator_nick": {
        "aliases": ["创建人昵称", "创建人", "录入人", "creator"],
        "label": "创建人昵称",
        "category": "销售",
        "field_type": "text",
    },
    "create_time": {
        "aliases": ["创建时间", "录入时间", "创建日期", "建档时间"],
        "label": "创建时间",
        "category": "销售",
        "field_type": "datetime",
    },
    "updater_nick": {
        "aliases": ["更新人昵称", "更新人", "修改人", "updater"],
        "label": "更新人昵称",
        "category": "销售",
        "field_type": "text",
    },
    "update_time": {
        "aliases": ["更新时间", "修改时间", "更新日期"],
        "label": "更新时间",
        "category": "销售",
        "field_type": "datetime",
    },
    "contact_status": {
        "aliases": ["触客情况", "联系情况", "触达情况", "是否触客", "接触状态"],
        "label": "触客情况",
        "category": "销售",
        "field_type": "text",
    },
    "no_contact_reason": {
        "aliases": ["未触客原因", "未联系原因", "未触达原因"],
        "label": "未触客原因",
        "category": "销售",
        "field_type": "text",
    },
    "no_contact_note": {
        "aliases": ["未触客说明", "未联系说明", "未触达说明"],
        "label": "未触客说明",
        "category": "销售",
        "field_type": "text",
    },
    "referral_bonus_status": {
        "aliases": ["引荐金发放状态", "推荐金发放状态", "引荐金状态", "推荐金状态"],
        "label": "引荐金发放状态",
        "category": "引荐金",
        "field_type": "text",
    },
    "referral_bonus_amount": {
        "aliases": ["引荐金发放金额", "推荐金发放金额", "引荐金金额", "推荐金金额"],
        "label": "引荐金发放金额",
        "category": "引荐金",
        "field_type": "number",
    },
    "sales_recording": {
        "aliases": ["销售录音", "录音", "通话录音"],
        "label": "销售录音",
        "category": "附件",
        "field_type": "text",
    },
    "handover_doc": {
        "aliases": ["交接单", "交车单", "交车单据"],
        "label": "交接单",
        "category": "附件",
        "field_type": "text",
    },
    "gender": {
        "aliases": ["性别", "gender", "sex"],
        "label": "性别",
        "category": "客户",
        "field_type": "text",
    },
    "age_group": {
        "aliases": ["年龄", "年龄段", "age", "年龄范围", "客户年龄"],
        "label": "年龄",
        "category": "客户",
        "field_type": "text",
    },
    "payment_method": {
        "aliases": ["购车付款方式", "付款方式", "支付方式", "购车方式", "购车类型"],
        "label": "购车付款方式",
        "category": "客户",
        "field_type": "text",
    },
    "owner_type": {
        "aliases": ["车主类型", "车主类别", "客户类型(车主)"],
        "label": "车主类型",
        "category": "客户",
        "field_type": "text",
    },
    "usage_scenario": {
        "aliases": ["用车场景", "使用场景", "用车需求", "使用需求"],
        "label": "用车场景",
        "category": "客户",
        "field_type": "text",
    },
    "residence": {
        "aliases": ["常住地", "居住地", "所在地", "地址", "地区"],
        "label": "常住地",
        "category": "客户",
        "field_type": "text",
    },
    "occupation": {
        "aliases": ["职业", "工作", "行业", "职位"],
        "label": "职业",
        "category": "客户",
        "field_type": "text",
    },
    "product_source": {
        "aliases": ["产品来源", "产品渠道", "产品出处"],
        "label": "产品来源",
        "category": "产品",
        "field_type": "text",
    },
    "product_type": {
        "aliases": ["产品类型", "产品类别", "产品种类"],
        "label": "产品类型",
        "category": "产品",
        "field_type": "text",
    },
    "product_name": {
        "aliases": ["产品名称", "产品名", "商品名称"],
        "label": "产品名称",
        "category": "产品",
        "field_type": "text",
    },
    "deal_status": {
        "aliases": ["成交状态", "交易状态", "订单状态", "成交情况", "签约状态"],
        "label": "成交状态",
        "category": "成交",
        "field_type": "text",
    },
    "is_store_product": {
        "aliases": ["是否店端产品", "是否店内产品", "店端产品"],
        "label": "是否店端产品",
        "category": "产品",
        "field_type": "text",
    },
    "deal_date": {
        "aliases": ["成交日期", "成交时间", "交易日期", "签约日期"],
        "label": "成交日期",
        "category": "成交",
        "field_type": "date",
    },
    "refund_date": {
        "aliases": ["退款日期", "退款时间", "退订日期"],
        "label": "退款日期",
        "category": "退款",
        "field_type": "date",
    },
    "refund_amount": {
        "aliases": ["退款金额", "退款额", "退订金额"],
        "label": "退款金额",
        "category": "退款",
        "field_type": "number",
    },
    "product_years": {
        "aliases": ["产品年限", "服务年限", "保障年限", "年限"],
        "label": "产品年限",
        "category": "产品",
        "field_type": "text",
    },
    "deal_amount": {
        "aliases": ["销售金额", "成交金额", "销售额", "金额", "订单金额", "售价"],
        "label": "销售金额",
        "category": "成交",
        "field_type": "number",
    },
    "related_order": {
        "aliases": ["关联订单", "关联单号", "关联单据"],
        "label": "关联订单",
        "category": "成交",
        "field_type": "text",
    },
    "no_deal_reason": {
        "aliases": ["未成交原因", "未签约原因", "失败原因"],
        "label": "未成交原因",
        "category": "成交",
        "field_type": "text",
    },
    "no_deal_note": {
        "aliases": ["未成交说明", "未签约说明", "失败说明"],
        "label": "未成交说明",
        "category": "成交",
        "field_type": "text",
    },
    "referral_bonus": {
        "aliases": ["引荐金", "推荐金", "推荐奖励", "引荐奖励"],
        "label": "引荐金",
        "category": "引荐金",
        "field_type": "number",
    },
    "is_given": {
        "aliases": ["是否赠送", "是否已赠送"],
        "label": "是否赠送",
        "category": "其他",
        "field_type": "text",
    },
    "order_screenshot": {
        "aliases": ["订单截图", "订单图片", "订单凭证"],
        "label": "订单截图",
        "category": "附件",
        "field_type": "text",
    },
    "order_screenshot_ocr": {
        "aliases": ["订单截图ocr", "订单截图OCR", "订单OCR"],
        "label": "订单截图OCR",
        "category": "附件",
        "field_type": "text",
    },
    "rights_screenshot": {
        "aliases": ["权益截图", "权益图片", "权益凭证"],
        "label": "权益截图",
        "category": "附件",
        "field_type": "text",
    },
    "rights_screenshot_ocr": {
        "aliases": ["权益截图ocr", "权益截图OCR", "权益OCR"],
        "label": "权益截图OCR",
        "category": "附件",
        "field_type": "text",
    },
    "is_abnormal": {
        "aliases": ["是否异常客户", "是否异常", "异常标记", "异常客户"],
        "label": "是否异常客户",
        "category": "其他",
        "field_type": "text",
    },
    "abnormal_info": {
        "aliases": ["异常信息", "异常说明", "异常详情"],
        "label": "异常信息",
        "category": "其他",
        "field_type": "text",
    },
}

# Fields that are used as filterable dimensions in the dashboard
FILTERABLE_FIELDS = [
    "brand", "model_series", "salesperson", "product_type", "product_source",
    "deal_status", "contact_status", "gender", "age_group", "customer_source",
    "merchant_name", "payment_method", "owner_type", "product_years", "fuel_type",
    "create_method", "referrer", "residence", "occupation", "customer_type",
    "is_store_product", "is_abnormal", "no_deal_reason", "no_contact_reason",
]

# Fields that support date range filtering
DATE_FIELDS = ["create_time", "update_time", "deal_date", "delivery_date", "refund_date"]

# Fields that support numeric range filtering
NUMERIC_FIELDS = ["deal_amount", "refund_amount", "referral_bonus", "referral_bonus_amount"]

# Fields that are considered "soft-required" — importable without them but reduced functionality
SOFT_REQUIRED_FIELDS = ["deal_status", "create_time"]


def get_field_label(field_name: str) -> str:
    """Get the Chinese display label for a standard field."""
    if field_name in STANDARD_FIELDS:
        return STANDARD_FIELDS[field_name]["label"]
    return field_name


def get_all_field_labels() -> dict[str, str]:
    """Get mapping of field_name -> Chinese label for all standard fields."""
    return {k: v["label"] for k, v in STANDARD_FIELDS.items()}
