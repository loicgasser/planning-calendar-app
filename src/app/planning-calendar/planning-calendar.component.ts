import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewEncapsulation, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningCalendarConfig, PlanningCalendarData } from './planning-calendar.model';

// Internal interface to manage cell state, including spanning
interface CalendarCell {
  isHidden: boolean;
  data?: PlanningCalendarData;
}

@Component({
  selector: 'app-planning-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './planning-calendar.component.html',
  styleUrls: ['./planning-calendar.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class PlanningCalendarComponent implements OnChanges {
  @Input({ required: true }) config!: PlanningCalendarConfig;
  @Output() onSave = new EventEmitter<PlanningCalendarData[]>();

  public monthHeaders: { month: number; label: string }[] = [];
  public calendarData = new Map<string | number, Map<number, CalendarCell>>();

  public activeCell: { rowId: string | number; month: number } | null = null;
  public editValue: string = '';

  private readonly MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // --- Resizing State ---
  private isResizing = false;
  private resizeInfo: {
    rowId: string | number;
    startMonth: number;
    initialDuration: number;
    startX: number; // The initial mouse X position
    cellWidth: number; // The width of a single month cell
  } | null = null;

  constructor(private el: ElementRef) {}

  // --- Global Event Listeners for Resizing ---
  @HostListener('document:mousemove', ['$event'])
  onResizeMove(event: MouseEvent): void {
    if (!this.isResizing || !this.resizeInfo) return;

    const deltaX = event.clientX - this.resizeInfo.startX;
    const monthChange = Math.round(deltaX / this.resizeInfo.cellWidth);
    let newDuration = this.resizeInfo.initialDuration + monthChange;

    // Constrain duration: minimum 1, maximum fits on calendar
    newDuration = Math.max(1, newDuration);
    const maxDuration = 13 - this.getMonthColumn(this.resizeInfo.startMonth);
    newDuration = Math.min(newDuration, maxDuration);

    const cell = this.calendarData.get(this.resizeInfo.rowId)?.get(this.resizeInfo.startMonth);
    if (cell?.data && cell.data.duration !== newDuration) {
      this.setData(this.resizeInfo.rowId, this.resizeInfo.startMonth, cell.data.value, newDuration);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onResizeEnd(event: MouseEvent): void {
    if (this.isResizing) {
      this.isResizing = false;
      this.resizeInfo = null;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.generateMonthHeaders();
      this.processInitialData();
    }
  }
  
  private generateMonthHeaders(): void {
    this.monthHeaders = [];
    for (let i = 0; i < 12; i++) {
      const monthIndex = (this.config.startMonth - 1 + i) % 12;
      this.monthHeaders.push({ month: monthIndex + 1, label: this.MONTH_NAMES[monthIndex] });
    }
  }

  private processInitialData(): void {
    this.calendarData.clear();
    this.config.rowHeaders.forEach(row => {
      const rowMap = new Map<number, CalendarCell>();
      this.monthHeaders.forEach(header => {
        rowMap.set(header.month, { isHidden: false });
      });
      this.calendarData.set(row.id, rowMap);
    });

    this.config.initialData.forEach(dataItem => {
      this.setData(dataItem.rowId, dataItem.month, dataItem.value, dataItem.duration);
    });
  }

  private setData(rowId: string | number, month: number, value: string, duration: number = 1): void {
    const row = this.calendarData.get(rowId);
    if (!row) return;

    // First, clear previous state for this item if it exists, to handle duration changes
    const existingEntry = Array.from(row.values()).find(c => c.data?.rowId === rowId && c.data?.month === month);
    if (existingEntry && existingEntry.data) {
        this.clearData(rowId, month, existingEntry.data.duration || 1);
    }
    
    // Set the primary cell's data
    const cellData: PlanningCalendarData = { rowId, month, value, duration };
    row.set(month, { isHidden: false, data: cellData });

    // Hide subsequent cells that are spanned
    for (let i = 1; i < duration; i++) {
        const nextMonth = this.monthHeaders[(this.getMonthColumn(month) -1 + i) % 12].month;
        const cell = row.get(nextMonth);
        if (cell) cell.isHidden = true;
    }
  }

  private clearData(rowId: string | number, month: number, duration: number = 1): void {
    const row = this.calendarData.get(rowId);
    if (!row) return;

    // Clear primary cell
    const primaryCell = row.get(month);
    if(primaryCell) primaryCell.data = undefined;

    // Un-hide spanned cells
    for (let i = 1; i < duration; i++) {
        const nextMonth = this.monthHeaders[(this.getMonthColumn(month) -1 + i) % 12].month;
        const spannedCell = row.get(nextMonth);
        if (spannedCell) spannedCell.isHidden = false;
    }
  }
  
  public onCellClick(rowId: string | number, month: number): void {
    if (this.isCellActive(rowId, month) || this.isResizing) {
      return;
    }
    const cell = this.calendarData.get(rowId)?.get(month);
    this.activeCell = { rowId, month };
    this.editValue = cell?.data?.value ?? '';
  }

  public saveEdit(): void {
    if (!this.activeCell) return;
    const { rowId, month } = this.activeCell;
    const existingCell = this.calendarData.get(rowId)?.get(month);

    if (!this.editValue.trim()) {
        this.deleteEntry(rowId, month);
    } else {
        const currentDuration = existingCell?.data?.duration || 1;
        this.setData(rowId, month, this.editValue, currentDuration);
    }
    this.clearActiveState();
  }
  
  public deleteEntry(rowId: string | number, month: number): void {
    const cell = this.calendarData.get(rowId)?.get(month);
    if (!cell?.data) return;
    this.clearData(rowId, month, cell.data.duration);
    this.clearActiveState();
  }

  public onResizeStart(event: MouseEvent, rowId: string | number, month: number): void {
    event.preventDefault();
    event.stopPropagation(); // Prevent onCellClick from firing

    const cellData = this.calendarData.get(rowId)?.get(month)?.data;
    if (!cellData) return;
    
    // Get the width of a single cell for calculations
    const cellElement = this.el.nativeElement.querySelector('.data-col');
    if (!cellElement) return;

    this.isResizing = true;
    this.resizeInfo = {
      rowId: rowId,
      startMonth: month,
      initialDuration: cellData.duration || 1,
      startX: event.clientX,
      cellWidth: cellElement.offsetWidth,
    };
  }
  
  // Helper to find the column index (1-12) of a given month
  private getMonthColumn(month: number): number {
    return this.monthHeaders.findIndex(h => h.month === month) + 1;
  }

  public isCellActive(rowId: string | number, month: number): boolean {
    return this.activeCell?.rowId === rowId && this.activeCell?.month === month;
  }
  
  private clearActiveState(): void {
    this.activeCell = null;
    this.editValue = '';
  }

  public getCalendarData(): void {
    const allData: PlanningCalendarData[] = [];
    this.calendarData.forEach(rowMap => {
      rowMap.forEach(cell => {
        if (cell.data && cell.data.value) {
          allData.push(cell.data);
        }
      });
    });
    this.onSave.emit(allData);
  }
}