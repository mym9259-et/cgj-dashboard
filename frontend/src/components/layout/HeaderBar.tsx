import { useEffect, useState, useCallback, useRef } from "react";
import { Layout, DatePicker, Space, Select, Button, AutoComplete, Input } from "antd";
import { ClearOutlined, FilterOutlined } from "@ant-design/icons";
import { useFilterStore } from "../../stores/filterStore";
import { FILTERABLE_FIELDS, getFieldLabel } from "../../utils/fieldLabels";
import { getDistinctValues } from "../../api/dashboard";
import type { FilterItem } from "../../types/filter";
import dayjs from "dayjs";

const { Header } = Layout;
const { RangePicker } = DatePicker;

// Cache for distinct values per field
const distinctCache: Record<string, string[]> = {};

export default function HeaderBar() {
  const {
    filters,
    filterLogic,
    startDate,
    endDate,
    addFilter,
    removeFilter,
    updateFilter,
    setFilterLogic,
    setDateRange,
    clearAll,
  } = useFilterStore();

  const addNewFilter = () => {
    addFilter({ field: "brand", operator: "eq", value: null });
  };

  return (
    <Header
      style={{
        background: "#fff",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: "1px solid #f0f0f0",
        height: 56,
        flexWrap: "wrap",
        overflow: "visible",
      }}
    >
      <RangePicker
        size="small"
        value={
          startDate && endDate
            ? [dayjs(startDate), dayjs(endDate)]
            : null
        }
        onChange={(dates) => {
          if (dates && dates[0] && dates[1]) {
            setDateRange(
              dates[0].format("YYYY-MM-DD"),
              dates[1].format("YYYY-MM-DD")
            );
          } else {
            setDateRange(null, null);
          }
        }}
        placeholder={["开始日期", "结束日期"]}
        style={{ width: 240 }}
      />

      {filters.map((f, i) => (
        <FilterChip
          key={`${f.field}-${i}`}
          index={i}
          filter={f}
          onUpdate={(idx, filter) => updateFilter(idx, filter)}
          onRemove={(idx) => removeFilter(idx)}
        />
      ))}

      <Button size="small" icon={<FilterOutlined />} onClick={addNewFilter}>
        添加筛选
      </Button>

      {filters.length > 1 && (
        <Select
          size="small"
          value={filterLogic}
          onChange={setFilterLogic}
          style={{ width: 70 }}
          options={[
            { label: "AND", value: "AND" },
            { label: "OR", value: "OR" },
          ]}
        />
      )}

      {filters.length > 0 && (
        <Button size="small" icon={<ClearOutlined />} onClick={clearAll} danger>
          清除
        </Button>
      )}
    </Header>
  );
}

function FilterChip({
  index,
  filter,
  onUpdate,
  onRemove,
}: {
  index: number;
  filter: FilterItem;
  onUpdate: (idx: number, f: FilterItem) => void;
  onRemove: (idx: number) => void;
}) {
  const isMulti = filter.operator === "in" || filter.operator === "nin";
  const isNumericOp = ["gte", "lte"].includes(filter.operator);

  // Local draft state - only committed on confirm
  const initVal = filter.value;
  const [draftValue, setDraftValue] = useState<string | string[] | null>(
    initVal != null ? String(initVal) : null
  );
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const fieldRef = useRef(filter.field);

  // Sync draft when external filter changes (e.g. operator change resets value)
  useEffect(() => {
    const v = filter.value;
    setDraftValue(v != null ? String(v) : null);
  }, [filter.value]);

  // Fetch distinct values when field changes
  useEffect(() => {
    if (filter.field !== fieldRef.current) {
      fieldRef.current = filter.field;
      loadOptions(filter.field);
    }
  }, [filter.field]);

  const loadOptions = async (field: string) => {
    if (distinctCache[field]) {
      setOptions(distinctCache[field].map((v) => ({ value: v, label: v })));
      return;
    }
    try {
      const values = await getDistinctValues([field]);
      const fieldValues = values[field] || [];
      distinctCache[field] = fieldValues;
      setOptions(fieldValues.map((v) => ({ value: v, label: v })));
    } catch {
      setOptions([]);
    }
  };

  // Commit draft to store (triggers dashboard refresh)
  const commitValue = useCallback(
    (val: string | string[] | null) => {
      if (isMulti) {
        onUpdate(index, { ...filter, value: (val as string[]) || [] });
      } else {
        onUpdate(index, { ...filter, value: val as string });
      }
    },
    [index, filter, isMulti, onUpdate]
  );

  // Filter options for autocomplete based on user input
  const filterOptions = (inputValue: string, option: { value: string; label: string } | undefined) => {
    if (!inputValue || !option) return true;
    return option.label.toLowerCase().includes(inputValue.toLowerCase());
  };

  return (
    <Space.Compact size="small">
      <Select
        size="small"
        value={filter.field}
        onChange={(v) => {
          fieldRef.current = v;
          onUpdate(index, { ...filter, field: v, value: null });
          setDraftValue(null);
          loadOptions(v);
        }}
        style={{ width: 130 }}
        options={FILTERABLE_FIELDS.map((f) => ({
          label: getFieldLabel(f),
          value: f,
        }))}
        showSearch
      />
      <Select
        size="small"
        value={filter.operator}
        onChange={(v) => {
          onUpdate(index, { ...filter, operator: v, value: null });
          setDraftValue(null);
        }}
        style={{ width: 90 }}
        options={[
          { label: "等于", value: "eq" },
          { label: "不等于", value: "neq" },
          { label: "包含", value: "in" },
          { label: "不包含", value: "nin" },
          { label: "大于等于", value: "gte" },
          { label: "小于等于", value: "lte" },
          { label: "含有", value: "contains" },
        ]}
      />
      {isNumericOp ? (
        <Input
          size="small"
          value={(draftValue as string) || ""}
          onChange={(e) => setDraftValue(e.target.value)}
          onPressEnter={() => commitValue(draftValue)}
          onBlur={() => commitValue(draftValue)}
          style={{ width: 160 }}
          placeholder="输入数值"
        />
      ) : isMulti ? (
        <Select
          size="small"
          mode="tags"
          value={Array.isArray(draftValue) ? draftValue : []}
          onChange={(v) => {
            setDraftValue(v);
            commitValue(v); // multi-select commits immediately on select
          }}
          style={{ width: 160 }}
          placeholder="输入或选择"
          options={options}
          showSearch
          filterOption={filterOptions as any}
          allowClear
        />
      ) : (
        <AutoComplete
          size="small"
          value={(draftValue as string) || ""}
          onChange={(v) => setDraftValue(v)}
          onSelect={(v) => commitValue(v)}
          onBlur={() => commitValue(draftValue)}
          style={{ width: 160 }}
          placeholder="输入值（回车确认）"
          options={options}
          filterOption={filterOptions as any}
          allowClear
        />
      )}
      <Button size="small" onClick={() => onRemove(index)}>×</Button>
    </Space.Compact>
  );
}
