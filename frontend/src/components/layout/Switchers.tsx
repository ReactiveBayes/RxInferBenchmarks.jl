"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IndexHardware } from "@/lib/data/types";

export function HardwareSwitcher({
  hardware,
  value,
  onChange,
}: {
  hardware: IndexHardware[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" aria-label="Hardware">
        <SelectValue placeholder="Hardware" />
      </SelectTrigger>
      <SelectContent>
        {hardware.map((hw) => (
          <SelectItem key={hw.id} value={hw.id}>
            {hw.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function JuliaSwitcher({
  versions,
  value,
  onChange,
}: {
  versions: string[];
  value: string;
  onChange: (version: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" aria-label="Julia version">
        <SelectValue placeholder="Julia" />
      </SelectTrigger>
      <SelectContent>
        {versions.map((version) => (
          <SelectItem key={version} value={version}>
            Julia {version}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
