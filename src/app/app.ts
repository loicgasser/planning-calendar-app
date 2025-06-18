import { Component, ViewChild } from '@angular/core';

import { PlanningCalendarComponent } from './planning-calendar/planning-calendar.component';
import { PlanningCalendarConfig, PlanningCalendarData } from './planning-calendar/planning-calendar.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ PlanningCalendarComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  // Use ViewChild to get a reference to the calendar component instance
  @ViewChild('planningCalendar') planningCalendar!: PlanningCalendarComponent;

  title = 'planning-calendar-demo';
  
  // Example configuration that matches the wireframe
  public calendarConfig: PlanningCalendarConfig = {
    stickyColumnHeader: 'Marketing Tactic',
    startMonth: 6, // June
    rowHeaders: [
      { id: 'google', label: 'Google' },
      { id: 'meta', label: 'Meta' },
      { id: 'linkedin', label: 'LinkedIn' },
      { id: 'tiktok', label: 'TikTok' },
      { id: 'outbound', label: 'Outbound Sales' },
      { id: 'inbound', label: 'Inbound Leads' },
      { id: 'affiliate', label: 'Affiliate Marketing' },
      { id: 'events', label: 'Industry Events' },
      { id: 'partners', label: 'Partnerships' },
      { id: 'seo', label: 'SEO Optimization' },
    ],
    initialData: [
      { rowId: 'meta', month: 6, value: '$100,000', duration: 2 }, // Spans June-July
      { rowId: 'tiktok', month: 7, value: '$50,000', duration: 3 }, // Spans July-September
      { rowId: 'inbound', month: 10, value: 'Q4 Push', duration: 3 }, // Spans Oct-Dec
    ]
  };

  public savedData: PlanningCalendarData[] | null = null;

  // This method calls the public method on the child component
  saveCalendarData() {
    this.planningCalendar.getCalendarData();
  }

  // This method is bound to the (onSave) event from the child
  onCalendarSave(data: PlanningCalendarData[]) {
    console.log('Data received from calendar:', data);
    this.savedData = data;
    // Here you would typically send the data to a backend API
    alert('Calendar data has been saved! Check the console.');
  }
}