/**
 * Represents a single data entry in the calendar.
 * A duration of 2 or more will cause the cell to span horizontally.
 */
export interface PlanningCalendarData {
  rowId: string | number;
  month: number; // 1 for January, 12 for December
  value: string;
  duration?: number; // Span N months, defaults to 1
}

/**
 * The main configuration object for the Planning Calendar component.
 */
export interface PlanningCalendarConfig {
  stickyColumnHeader: string;
  rowHeaders: { id: string | number; label: string }[];
  startMonth: number; // 1 for January, 12 for December
  initialData: PlanningCalendarData[];
}