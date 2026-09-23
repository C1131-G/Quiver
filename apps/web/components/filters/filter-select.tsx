"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export interface FilterOption {
  label: string;
  value: string;
}

export const FilterSelect = ({
  className = "w-44",
  items,
  label,
  onChange,
  value,
}: {
  className?: string;
  items: FilterOption[];
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <Select
    items={items}
    onValueChange={(next) => onChange(String(next))}
    value={value}
  >
    <SelectTrigger aria-label={label} className={className}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
