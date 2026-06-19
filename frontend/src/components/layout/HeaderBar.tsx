import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Layout,
  Popover,
  Select,
  Space,
  Tag,
} from "antd";
import {
  CheckOutlined,
  ClearOutlined,
  FilterOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getDistinctValues } from "../../api/dashboard";
import { useFilterStore } from "../../stores/filterStore";
import type { FilterItem } from "../../types/filter";
import { FILTERABLE_FIELDS, getFieldLabel } from "../../utils/fieldLabels";

const { Header } = Layout;
const { RangePicker } = DatePicker;
function toValues(value: FilterItem["value"]): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value === null || value === "") return [];
  return [String(value)];
}

function getValueSummary(values: string[]) {
  if (values.length === 0) return "未选择";
  if (values.length <= 2) return values.join("、");
  return `${values.slice(0, 2).join("、")} +${values.length - 2}`;
}

type FilterEditorProps = {
  initialField: string;
  initialValues?: string[];
  availableFields: string[];
  onApply: (field: string, values: string[]) => void;
  onCancel: () => void;
};

function FilterEditor({
  initialField,
  initialValues = [],
  availableFields,
  onApply,
  onCancel,
}: FilterEditorProps) {
  const [field, setField] = useState(initialField);
  const [values, setValues] = useState<string[]>(initialValues);
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOptions = useCallback(async (targetField: string) => {
    setLoading(true);
    try {
      const result = await getDistinctValues([targetField]);
      setOptions((result[targetField] || []).map((value) => ({ value, label: value })));
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setField(initialField);
    setValues(initialValues);
    loadOptions(initialField);
  }, [initialField, initialValues.join("\u0000"), loadOptions]);

  const fieldOptions = availableFields.map((item) => ({
    label: getFieldLabel(item),
    value: item,
  }));

  return (
    <div style={{ width: 440, maxWidth: "calc(100vw - 48px)" }}>
      <div style={{ color: "#595959", fontSize: 12, marginBottom: 6 }}>筛选字段</div>
      <Select
        value={field}
        options={fieldOptions}
        showSearch
        optionFilterProp="label"
        style={{ width: "100%" }}
        onChange={(nextField) => {
          setField(nextField);
          setValues([]);
          loadOptions(nextField);
        }}
      />

      <div style={{ color: "#595959", fontSize: 12, margin: "14px 0 6px" }}>
        筛选值
      </div>
      <Select
        mode="multiple"
        value={values}
        options={options}
        loading={loading}
        showSearch
        allowClear
        optionFilterProp="label"
        maxTagCount="responsive"
        placeholder={`搜索并选择${getFieldLabel(field)}`}
        style={{ width: "100%" }}
        listHeight={300}
        filterOption={(input, option) =>
          String(option?.label ?? "").toLowerCase().includes(input.trim().toLowerCase())
        }
        onChange={setValues}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <span style={{ color: "#8c8c8c", fontSize: 12 }}>
          已选择 {values.length} 项
        </span>
        <Space size={8}>
          <Button size="small" onClick={onCancel}>取消</Button>
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            disabled={values.length === 0}
            onClick={() => onApply(field, values)}
          >
            应用
          </Button>
        </Space>
      </div>
    </div>
  );
}

function AppliedFilterChip({
  filter,
  index,
  usedFields,
  onUpdate,
  onRemove,
}: {
  filter: FilterItem;
  index: number;
  usedFields: string[];
  onUpdate: (index: number, filter: FilterItem) => void;
  onRemove: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const values = toValues(filter.value);
  const availableFields = FILTERABLE_FIELDS.filter(
    (field) => field === filter.field || !usedFields.includes(field)
  );

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      open={open}
      onOpenChange={setOpen}
      content={
        <FilterEditor
          initialField={filter.field}
          initialValues={values}
          availableFields={availableFields}
          onCancel={() => setOpen(false)}
          onApply={(field, nextValues) => {
            onUpdate(index, { field, operator: "in", value: nextValues });
            setOpen(false);
          }}
        />
      }
    >
      <Tag
        closable
        color="blue"
        onClose={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemove(index);
        }}
        style={{
          margin: 0,
          padding: "3px 8px",
          maxWidth: 300,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: 600, marginRight: 5, flexShrink: 0 }}>
          {getFieldLabel(filter.field)}
        </span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {getValueSummary(values)}
        </span>
      </Tag>
    </Popover>
  );
}

function AddFilterButton({
  usedFields,
  onAdd,
}: {
  usedFields: string[];
  onAdd: (filter: FilterItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const availableFields = FILTERABLE_FIELDS.filter((field) => !usedFields.includes(field));
  const initialField = availableFields[0] || FILTERABLE_FIELDS[0];

  if (availableFields.length === 0) return null;

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      open={open}
      onOpenChange={setOpen}
      content={
        <FilterEditor
          initialField={initialField}
          availableFields={availableFields}
          onCancel={() => setOpen(false)}
          onApply={(field, values) => {
            onAdd({ field, operator: "in", value: values });
            setOpen(false);
          }}
        />
      }
    >
      <Button size="small" icon={<PlusOutlined />}>添加筛选</Button>
    </Popover>
  );
}

export default function HeaderBar() {
  const {
    filters,
    startDate,
    endDate,
    addFilter,
    removeFilter,
    updateFilter,
    setFilterLogic,
    setDateRange,
    clearAll,
  } = useFilterStore();

  const usedFields = useMemo(() => filters.map((filter) => filter.field), [filters]);
  const hasActiveFilters = filters.length > 0 || Boolean(startDate || endDate);

  const applyAndLogic = () => setFilterLogic("AND");

  return (
    <Header
      style={{
        background: "#fff",
        padding: "10px 24px",
        borderBottom: "1px solid #f0f0f0",
        height: "auto",
        minHeight: 56,
        lineHeight: "normal",
        overflow: "visible",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <RangePicker
          size="small"
          value={startDate && endDate ? [dayjs(startDate), dayjs(endDate)] : null}
          onChange={(dates) => {
            if (dates?.[0] && dates?.[1]) {
              setDateRange(dates[0].format("YYYY-MM-DD"), dates[1].format("YYYY-MM-DD"));
            } else {
              setDateRange(null, null);
            }
          }}
          placeholder={["交付开始日期", "交付结束日期"]}
          style={{ width: 250 }}
        />

        <AddFilterButton
          usedFields={usedFields}
          onAdd={(filter) => {
            applyAndLogic();
            addFilter(filter);
          }}
        />

        {hasActiveFilters && (
          <Button size="small" type="text" icon={<ClearOutlined />} onClick={clearAll}>
            清空筛选
          </Button>
        )}

        {filters.length > 0 && (
          <span style={{ color: "#8c8c8c", fontSize: 12 }}>
            <FilterOutlined style={{ marginRight: 4 }} />已应用 {filters.length} 个条件
          </span>
        )}
      </div>

      {filters.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 9 }}>
          {filters.map((filter, index) => (
            <AppliedFilterChip
              key={`${filter.field}-${index}`}
              filter={filter}
              index={index}
              usedFields={usedFields}
              onUpdate={(targetIndex, nextFilter) => {
                applyAndLogic();
                updateFilter(targetIndex, nextFilter);
              }}
              onRemove={removeFilter}
            />
          ))}
        </div>
      )}
    </Header>
  );
}
