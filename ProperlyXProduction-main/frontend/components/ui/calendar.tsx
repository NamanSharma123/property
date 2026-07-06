import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  showFooter?: boolean;
  onClear?: () => void;
  onToday?: () => void;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  showFooter = true,
  onClear,
  onToday,
  ...props
}: CalendarProps) {
  return (
    <div className="flex flex-col">
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-3", className)}
        classNames={{
          // Replicating exact v8 styling with v9 class names
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          month_caption: "flex justify-start pt-1 pl-1 relative items-center w-full",
          caption_label: "text-sm font-medium flex items-center gap-0.5",
          nav: "flex items-center gap-0 absolute right-1 flex-col",
          button_previous: cn(
            "h-6 w-6 bg-transparent p-0 opacity-60 hover:opacity-100 inline-flex items-center justify-center cursor-pointer"
          ),
          button_next: cn(
            "h-6 w-6 bg-transparent p-0 opacity-60 hover:opacity-100 inline-flex items-center justify-center cursor-pointer"
          ),
          month_grid: "w-full border-collapse space-y-1",
          weekdays: "flex",
          weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          week: "flex w-full mt-2",
          day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day_button: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100 cursor-pointer"
          ),
          range_end: "day-range-end",
          selected:
            "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white",
          today: "border border-blue-600 text-blue-600",
          outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          disabled: "text-muted-foreground opacity-50",
          range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          hidden: "invisible",
          ...classNames,
        }}
        components={{
          CaptionLabel: ({ children }) => (
            <span className="text-sm font-medium flex items-center gap-0.5">
              {children}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </span>
          ),
          // Simple arrow text icons matching original design
          Chevron: ({ orientation, ...chevronProps }) => (
            <span className="text-lg leading-none" {...chevronProps}>
              {orientation === "left" ? "↑" : "↓"}
            </span>
          ),
        }}
        {...props}
      />
      {showFooter && (
        <div className="flex justify-between px-3 pb-3 pt-1">
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            onClick={onClear}
          >
            Clear
          </button>
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            onClick={onToday}
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
