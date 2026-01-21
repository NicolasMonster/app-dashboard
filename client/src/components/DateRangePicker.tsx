import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDateRange } from "@/contexts/DateRangeContext";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

/**
 * Interactive Date Range Picker Component
 * Features:
 * - Calendar popup for selecting date ranges
 * - Displays selected range in a minimalist format
 * - Auto-updates data when range changes
 * - Validates date ranges automatically
 */
export function DateRangePicker() {
  const { dateRange, setDateRange } = useDateRange();
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({});

  // Parse current date range into Date objects
  const fromDate = dateRange.since ? parse(dateRange.since, "yyyy-MM-dd", new Date()) : undefined;
  const toDate = dateRange.until ? parse(dateRange.until, "yyyy-MM-dd", new Date()) : undefined;

  // Handle date selection
  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) {
      setTempRange({});
      return;
    }

    setTempRange(range);

    // If both dates are selected, update the context and close popover
    if (range.from && range.to) {
      setDateRange({
        since: format(range.from, "yyyy-MM-dd"),
        until: format(range.to, "yyyy-MM-dd"),
      });
      setIsOpen(false);
      setTempRange({});
    }
  };

  // Format display text
  const getDisplayText = () => {
    if (fromDate && toDate) {
      return `${format(fromDate, "dd MMM yyyy", { locale: es })} - ${format(toDate, "dd MMM yyyy", { locale: es })}`;
    }
    return "Seleccionar rango de fechas";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal min-w-[280px]",
            !fromDate && !toDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={fromDate}
          selected={{ from: tempRange.from || fromDate, to: tempRange.to || toDate }}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
          locale={es}
        />
      </PopoverContent>
    </Popover>
  );
}
