import { Layout, DatePicker, Space, Select, Button, Input } from "antd";
import { ClearOutlined, FilterOutlined } from "@ant-design/icons";
import { useFilterStore } from "../../stores/filterStore";
import { FILTERABLE_FIELDS, getFieldLabel } from "../../utils/fieldLabels";
import type { FilterItem } from "../../types/filter";
import dayjs from "dayjs";

const { Header } = Layout;
const { RangePicker } = DatePicker;

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
          key={i}
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

  const handleValueChange = (v: string | string[]) => {
    if (isMulti) {
      onUpdate(index, { ...filter, value: v as string[] });
    } else {
      onUpdate(index, { ...filter, value: v as string });
    }
  };

  return (
    <Space.Compact size="small">
      <Select
        size="small"
        value={filter.field}
        onChange={(v) => onUpdate(index, { ...filter, field: v, value: null })}
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
        onChange={(v) => onUpdate(index, { ...filter, operator: v, value: null })}
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
      {isMulti ? (
        <Select
          size="small"
          mode="tags"
          value={Array.isArray(filter.value) ? filter.value : []}
          onChange={(v) => handleValueChange(v)}
          style={{ width: 160 }}
          placeholder="输入值"
          allowClear
        />
      ) : (
        <Input
          size="small"
          value={(filter.value as string) || ""}
          onChange={(e) => handleValueChange(e.target.value)}
          style={{ width: 160 }}
          placeholder="输入值"
          allowClear
        />
      )}
      <Button size="small" onClick={() => onRemove(index)}>×</Button>
    </Space.Compact>
  );
}
