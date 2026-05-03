import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { cn } from "../../lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("tw-p-3", className)}
      classNames={{
        months: "tw-flex tw-flex-col sm:tw-flex-row tw-gap-4",
        month: "tw-flex tw-flex-col tw-gap-4",
        caption: "tw-flex tw-justify-center tw-relative tw-items-center tw-w-full",
        caption_label: "tw-text-sm tw-font-semibold tw-text-[#09090b]",
        nav: "tw-flex tw-items-center tw-gap-1",
        nav_button:
          "tw-inline-flex tw-items-center tw-justify-center tw-h-7 tw-w-7 tw-rounded-md tw-border tw-border-[#e4e4e7] tw-bg-white tw-text-[#71717a] hover:tw-bg-[#f4f4f5] hover:tw-text-[#09090b] tw-transition-colors",
        nav_button_previous: "tw-absolute tw-left-1",
        nav_button_next: "tw-absolute tw-right-1",
        table: "tw-w-full tw-border-collapse",
        head_row: "tw-flex",
        head_cell:
          "tw-text-[#71717a] tw-rounded-md tw-w-9 tw-font-medium tw-text-[0.8rem] tw-text-center",
        row: "tw-flex tw-w-full tw-mt-2",
        cell: cn(
          "tw-relative tw-p-0 tw-text-center tw-text-sm",
          "focus-within:tw-relative focus-within:tw-z-20"
        ),
        day: cn(
          "tw-h-9 tw-w-9 tw-p-0 tw-rounded-md tw-font-normal tw-text-[#09090b] tw-text-sm",
          "tw-inline-flex tw-items-center tw-justify-center",
          "hover:tw-bg-[#f4f4f5] hover:tw-text-[#09090b]",
          "tw-transition-colors tw-cursor-pointer"
        ),
        day_selected:
          "!tw-bg-[#09090b] !tw-text-white hover:!tw-bg-[#27272a] hover:!tw-text-white focus:!tw-bg-[#09090b] focus:!tw-text-white tw-rounded-md",
        day_today: "tw-bg-[#f4f4f5] tw-text-[#09090b] tw-font-semibold",
        day_outside: "tw-text-[#a1a1aa] tw-opacity-50",
        day_disabled: "tw-text-[#a1a1aa] tw-opacity-30 tw-cursor-not-allowed",
        day_hidden: "tw-invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="tw-h-4 tw-w-4" />,
        IconRight: () => <ChevronRight className="tw-h-4 tw-w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
