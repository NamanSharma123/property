'use client';

import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';

export interface MultiSelectOption {
  value: string;
  label: string;
  group?: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  showSearch?: boolean;
  maxDisplayItems?: number;
  groupLabels?: Record<string, string>;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select items...',
  emptyMessage = 'No items found.',
  className,
  showSearch = false,
  maxDisplayItems = 2,
  groupLabels,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (value: string) => {
    const isSelected = selected.includes(value);
    const newSelected = isSelected
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Group options by their group property
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, MultiSelectOption[]> = {};
    const ungrouped: MultiSelectOption[] = [];

    options.forEach((option) => {
      if (option.group) {
        if (!groups[option.group]) {
          groups[option.group] = [];
        }
        groups[option.group].push(option);
      } else {
        ungrouped.push(option);
      }
    });

    return { groups, ungrouped };
  }, [options]);

  const getDisplayText = () => {
    if (selected.length === 0) return null;
    if (selected.length === 1) {
      const option = options.find((o) => o.value === selected[0]);
      return option?.label || selected[0];
    }
    if (selected.length <= maxDisplayItems) {
      return selected
        .map((s) => {
          const option = options.find((o) => o.value === s);
          return option?.label || s;
        })
        .join(', ');
    }
    return `${selected.length} selected`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !selected.length && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {getDisplayText() || placeholder}
          </span>
          <div className="flex items-center gap-1 ml-2">
            {selected.length > 0 && (
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleClearAll}
              >
                <X className="h-3 w-3" />
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          {showSearch && <CommandInput placeholder="Search..." />}
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            
            {/* Ungrouped options */}
            {groupedOptions.ungrouped.length > 0 && (
              <CommandGroup>
                {groupedOptions.ungrouped.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleToggle(option.value)}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                        selected.includes(option.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Grouped options */}
            {Object.entries(groupedOptions.groups).map(([groupKey, groupOptions]) => (
              <CommandGroup
                key={groupKey}
                heading={groupLabels?.[groupKey] || groupKey}
              >
                {groupOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleToggle(option.value)}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                        selected.includes(option.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
