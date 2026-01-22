import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDateRange } from "@/contexts/DateRangeContext";
import { Calendar, Clock } from "lucide-react";

/**
 * Date Presets Component - Quick date range selection
 * Allows users to quickly select common date ranges
 * Presets are saved to localStorage for persistence
 */
export function DatePresets() {
  const { setDateRange } = useDateRange();

  const applyPreset = (preset: "7d" | "30d" | "90d" | "ytd" | "lastMonth") => {
    const today = new Date();
    const until = new Date(today);
    until.setDate(until.getDate() - 1); // Yesterday

    let since = new Date(until);

    switch (preset) {
      case "7d":
        since.setDate(until.getDate() - 6); // 7 days including today
        break;
      case "30d":
        since.setDate(until.getDate() - 29); // 30 days
        break;
      case "90d":
        since.setDate(until.getDate() - 89); // 90 days
        break;
      case "ytd":
        since = new Date(today.getFullYear(), 0, 1); // January 1st of current year
        break;
      case "lastMonth":
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        since = lastMonth;
        until.setMonth(today.getMonth(), 0); // Last day of previous month
        break;
    }

    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = until.toISOString().split('T')[0];

    setDateRange({ since: sinceStr, until: untilStr });

    // Save last used preset to localStorage
    localStorage.setItem('lastDatePreset', preset);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Clock className="h-4 w-4" />
          Vistas Rápidas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Rangos Predefinidos</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => applyPreset("7d")}>
          <Calendar className="mr-2 h-4 w-4" />
          <span>Últimos 7 días</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => applyPreset("30d")}>
          <Calendar className="mr-2 h-4 w-4" />
          <span>Últimos 30 días</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => applyPreset("90d")}>
          <Calendar className="mr-2 h-4 w-4" />
          <span>Últimos 90 días</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => applyPreset("lastMonth")}>
          <Calendar className="mr-2 h-4 w-4" />
          <span>Mes pasado</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => applyPreset("ytd")}>
          <Calendar className="mr-2 h-4 w-4" />
          <span>Año en curso</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
