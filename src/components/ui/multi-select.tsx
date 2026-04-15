"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  value: string
  label: string
}

export interface MultiSelectGroup {
  label: string
  options: MultiSelectOption[]
}

interface MultiSelectProps {
  options?: MultiSelectOption[]
  groups?: MultiSelectGroup[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

function OptionRow({
  option,
  checked,
  onToggle,
}: {
  option: MultiSelectOption
  checked: boolean
  onToggle: (value: string) => void
}) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer",
        checked
          ? "bg-primary/[0.08] text-primary"
          : "hover:bg-muted text-foreground"
      )}
      onClick={() => onToggle(option.value)}
    >
      <div
        className={cn(
          "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
          checked ? "bg-primary border-primary" : "border-border bg-background"
        )}
      >
        {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />}
      </div>
      <span className="truncate text-xs font-medium">{option.label}</span>
    </button>
  )
}

export function MultiSelect({
  options,
  groups,
  selected,
  onChange,
  placeholder = "Select...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const allOptions = React.useMemo(
    () => options ?? groups?.flatMap((g) => g.options) ?? [],
    [options, groups]
  )

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const triggerLabel =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (allOptions.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} selected`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal h-9 px-3 text-sm gap-2",
            selected.length === 0 ? "text-muted-foreground" : "text-foreground",
            className
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {selected.length > 0 && (
              <span
                className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-black leading-none"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange([])
                }}
                title="Clear selection"
              >
                {selected.length}
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 w-[230px] shadow-lg border border-border/60"
        align="start"
        sideOffset={4}
      >
        <div className="max-h-[280px] overflow-y-auto p-1">
          {groups ? (
            groups.map((group) => (
              <div key={group.label}>
                <div className="px-2 pt-2 pb-1 text-[10px] font-black text-primary uppercase tracking-widest">
                  {group.label}
                </div>
                {group.options.map((option) => (
                  <OptionRow
                    key={option.value}
                    option={option}
                    checked={selected.includes(option.value)}
                    onToggle={toggle}
                  />
                ))}
              </div>
            ))
          ) : (
            options?.map((option) => (
              <OptionRow
                key={option.value}
                option={option}
                checked={selected.includes(option.value)}
                onToggle={toggle}
              />
            ))
          )}
        </div>

        {selected.length > 0 && (
          <div className="border-t border-border/50 p-1">
            <button
              className="w-full text-center text-[10px] font-bold text-muted-foreground hover:text-primary py-1.5 rounded-md hover:bg-muted transition-colors"
              onClick={() => onChange([])}
            >
              Clear all ({selected.length})
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
