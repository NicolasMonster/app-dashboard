import React, { createContext, useContext, useState } from "react";
import { format, subDays } from "date-fns";

interface DateRange {
  since: string;
  until: string;
}

interface DateRangeContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  dateError: string | null;
  validateDateRange: (since: string, until: string) => boolean;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

interface DateRangeProviderProps {
  children: React.ReactNode;
}

export function DateRangeProvider({ children }: DateRangeProviderProps) {
  // Initialize with last 30 days, check localStorage first
  const getInitialDateRange = (): DateRange => {
    const stored = localStorage.getItem("metaAdsDashboard_dateRange");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate stored dates
        if (parsed.since && parsed.until) {
          return { since: parsed.since, until: parsed.until };
        }
      } catch {
        // Fall through to default
      }
    }

    // Default to last 30 days
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    return {
      since: format(thirtyDaysAgo, "yyyy-MM-dd"),
      until: format(today, "yyyy-MM-dd"),
    };
  };

  const [dateRange, setDateRangeState] = useState<DateRange>(getInitialDateRange);
  const [dateError, setDateError] = useState<string | null>(null);

  const validateDateRange = (since: string, until: string): boolean => {
    // Reset error
    setDateError(null);

    // Parse dates
    const sinceDate = new Date(since);
    const untilDate = new Date(until);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validation 1: Dates must be valid
    if (isNaN(sinceDate.getTime()) || isNaN(untilDate.getTime())) {
      setDateError("Fechas inválidas");
      return false;
    }

    // Validation 2: since cannot be after until
    if (sinceDate > untilDate) {
      setDateError("La fecha inicial no puede ser posterior a la fecha final");
      return false;
    }

    // Validation 3: until cannot be in the future
    if (untilDate > today) {
      setDateError("La fecha final no puede ser futura");
      return false;
    }

    // Validation 4: Date range cannot exceed 90 days
    const daysDiff = Math.floor((untilDate.getTime() - sinceDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      setDateError("El rango no puede exceder 90 días");
      return false;
    }

    return true;
  };

  const setDateRange = (range: DateRange) => {
    if (validateDateRange(range.since, range.until)) {
      setDateRangeState(range);
      // Persist to localStorage
      localStorage.setItem("metaAdsDashboard_dateRange", JSON.stringify(range));
    }
  };

  return (
    <DateRangeContext.Provider
      value={{
        dateRange,
        setDateRange,
        dateError,
        validateDateRange,
      }}
    >
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error("useDateRange must be used within DateRangeProvider");
  }
  return context;
}
