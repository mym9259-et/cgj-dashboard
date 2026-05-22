import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Index, Integer, JSON, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    batch_id: Mapped[str] = mapped_column(String(36), nullable=False)

    # Identifier
    source_id: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Merchant & Source
    merchant_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    customer_source: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Customer
    customer_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    age_group: Mapped[str | None] = mapped_column(String(30), nullable=True)
    residence: Mapped[str | None] = mapped_column(String(200), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Vehicle
    brand: Mapped[str | None] = mapped_column(String(50), nullable=True)
    model_series: Mapped[str | None] = mapped_column(String(50), nullable=True)
    vin: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fuel_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(30), nullable=True)
    owner_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    usage_scenario: Mapped[str | None] = mapped_column(String(200), nullable=True)
    customer_type: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Sales Process
    salesperson: Mapped[str | None] = mapped_column(String(50), nullable=True)
    referrer: Mapped[str | None] = mapped_column(String(50), nullable=True)
    create_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    creator_nick: Mapped[str | None] = mapped_column(String(50), nullable=True)
    create_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    update_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    contact_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    no_contact_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    no_contact_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Product
    product_source: Mapped[str | None] = mapped_column(String(30), nullable=True)
    product_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    product_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    product_years: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Deal Result
    deal_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    deal_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    deal_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    # No-deal
    no_deal_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    no_deal_note: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Refund
    refund_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    refund_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    # Referral Bonus
    referral_bonus_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    referral_bonus_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    referral_bonus: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    # Gifts
    is_gifted: Mapped[str | None] = mapped_column(String(5), nullable=True)
    gift_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Flags
    is_abnormal: Mapped[str | None] = mapped_column(String(5), nullable=True)
    abnormal_info: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_store_product: Mapped[str | None] = mapped_column(String(5), nullable=True)

    # Attachments
    order_screenshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_screenshot_ocr: Mapped[str | None] = mapped_column(Text, nullable=True)
    rights_screenshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    rights_screenshot_ocr: Mapped[str | None] = mapped_column(Text, nullable=True)
    sales_recording: Mapped[str | None] = mapped_column(Text, nullable=True)
    handover_doc: Mapped[str | None] = mapped_column(Text, nullable=True)
    related_order: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Extra fields for unmapped columns
    extra_fields: Mapped[dict | None] = mapped_column(JSON, default=dict, nullable=True)

    imported_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_leads_batch", "batch_id"),
        Index("ix_leads_deal_status", "deal_status"),
        Index("ix_leads_salesperson", "salesperson"),
        Index("ix_leads_create_time", "create_time"),
        Index("ix_leads_deal_date", "deal_date"),
        Index("ix_leads_brand", "brand"),
        Index("ix_leads_model", "model_series"),
        Index("ix_leads_product_type", "product_type"),
        Index("ix_leads_product_source", "product_source"),
        Index("ix_leads_merchant", "merchant_name"),
        Index("ix_leads_contact_status", "contact_status"),
        Index("ix_leads_gender", "gender"),
        Index("ix_leads_age_group", "age_group"),
        Index("ix_leads_customer_source", "customer_source"),
        Index("ix_leads_sales_deal", "salesperson", "deal_status"),
        Index("ix_leads_time_deal", "create_time", "deal_status"),
        Index("ix_leads_brand_model", "brand", "model_series"),
    )

    def to_dict(self) -> dict:
        """Convert lead to dict for API responses (excludes attachment URLs for brevity)."""
        return {
            "id": self.id,
            "source_id": self.source_id,
            "merchant_name": self.merchant_name,
            "customer_source": self.customer_source,
            "customer_name": self.customer_name,
            "customer_phone": self.customer_phone,
            "gender": self.gender,
            "age_group": self.age_group,
            "residence": self.residence,
            "occupation": self.occupation,
            "brand": self.brand,
            "model_series": self.model_series,
            "vin": self.vin,
            "fuel_type": self.fuel_type,
            "payment_method": self.payment_method,
            "owner_type": self.owner_type,
            "usage_scenario": self.usage_scenario,
            "customer_type": self.customer_type,
            "salesperson": self.salesperson,
            "referrer": self.referrer,
            "create_method": self.create_method,
            "creator_nick": self.creator_nick,
            "create_time": self.create_time.isoformat() if self.create_time else None,
            "update_time": self.update_time.isoformat() if self.update_time else None,
            "contact_status": self.contact_status,
            "no_contact_reason": self.no_contact_reason,
            "no_contact_note": self.no_contact_note,
            "delivery_date": self.delivery_date.isoformat() if self.delivery_date else None,
            "product_source": self.product_source,
            "product_type": self.product_type,
            "product_name": self.product_name,
            "product_years": self.product_years,
            "deal_status": self.deal_status,
            "deal_date": self.deal_date.isoformat() if self.deal_date else None,
            "deal_amount": float(self.deal_amount) if self.deal_amount else None,
            "no_deal_reason": self.no_deal_reason,
            "no_deal_note": self.no_deal_note,
            "refund_date": self.refund_date.isoformat() if self.refund_date else None,
            "refund_amount": float(self.refund_amount) if self.refund_amount else None,
            "referral_bonus_status": self.referral_bonus_status,
            "referral_bonus_amount": float(self.referral_bonus_amount) if self.referral_bonus_amount else None,
            "referral_bonus": float(self.referral_bonus) if self.referral_bonus else None,
            "is_gifted": self.is_gifted,
            "gift_name": self.gift_name,
            "is_abnormal": self.is_abnormal,
            "abnormal_info": self.abnormal_info,
            "is_store_product": self.is_store_product,
            "product_years": self.product_years,
            "related_order": self.related_order,
            "extra_fields": self.extra_fields or {},
        }
