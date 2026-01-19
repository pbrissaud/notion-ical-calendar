import { describe, expect, it } from "vitest";
import { calendarToString, generateCalendar } from "../calendar.js";
import type { CalendarEvent } from "../notion.js";

describe("calendar", () => {
	describe("generateCalendar", () => {
		it("should generate empty calendar with no events", () => {
			const calendar = generateCalendar([]);
			const icalString = calendarToString(calendar);

			expect(icalString).toContain("BEGIN:VCALENDAR");
			expect(icalString).toContain("END:VCALENDAR");
			expect(icalString).toContain("PRODID:");
			expect(icalString).not.toContain("BEGIN:VEVENT");
		});

		it("should generate calendar with timed event", () => {
			const events: CalendarEvent[] = [
				{
					id: "event-1",
					title: "Meeting",
					start: new Date("2024-01-15T10:00:00Z"),
					end: new Date("2024-01-15T11:00:00Z"),
					allDay: false,
					description: null,
					location: null,
					url: "https://notion.so/event-1",
				},
			];

			const calendar = generateCalendar(events);
			const icalString = calendarToString(calendar);

			expect(icalString).toContain("BEGIN:VEVENT");
			expect(icalString).toContain("SUMMARY:Meeting");
			expect(icalString).toContain("END:VEVENT");
			expect(icalString).toContain("URL;VALUE=URI:https://notion.so/event-1");
		});

		it("should generate calendar with all-day event", () => {
			const events: CalendarEvent[] = [
				{
					id: "event-2",
					title: "Holiday",
					start: new Date("2024-01-01"),
					end: null,
					allDay: true,
					description: null,
					location: null,
					url: "https://notion.so/event-2",
				},
			];

			const calendar = generateCalendar(events);
			const icalString = calendarToString(calendar);

			expect(icalString).toContain("BEGIN:VEVENT");
			expect(icalString).toContain("SUMMARY:Holiday");
			expect(icalString).toContain("END:VEVENT");
		});

		it("should include description when provided", () => {
			const events: CalendarEvent[] = [
				{
					id: "event-3",
					title: "Workshop",
					start: new Date("2024-02-10T14:00:00Z"),
					end: new Date("2024-02-10T16:00:00Z"),
					allDay: false,
					description: "Annual planning workshop",
					location: null,
					url: "https://notion.so/event-3",
				},
			];

			const calendar = generateCalendar(events);
			const icalString = calendarToString(calendar);

			expect(icalString).toContain("DESCRIPTION:Annual planning workshop");
		});

		it("should include location when provided", () => {
			const events: CalendarEvent[] = [
				{
					id: "event-4",
					title: "Conference",
					start: new Date("2024-03-20T09:00:00Z"),
					end: new Date("2024-03-20T17:00:00Z"),
					allDay: false,
					description: null,
					location: "Convention Center",
					url: "https://notion.so/event-4",
				},
			];

			const calendar = generateCalendar(events);
			const icalString = calendarToString(calendar);

			expect(icalString).toContain("LOCATION:Convention Center");
		});

		it("should handle multiple events", () => {
			const events: CalendarEvent[] = [
				{
					id: "event-1",
					title: "Event 1",
					start: new Date("2024-01-01T10:00:00Z"),
					end: new Date("2024-01-01T11:00:00Z"),
					allDay: false,
					description: null,
					location: null,
					url: "https://notion.so/event-1",
				},
				{
					id: "event-2",
					title: "Event 2",
					start: new Date("2024-01-02T14:00:00Z"),
					end: new Date("2024-01-02T15:00:00Z"),
					allDay: false,
					description: null,
					location: null,
					url: "https://notion.so/event-2",
				},
			];

			const calendar = generateCalendar(events);
			const icalString = calendarToString(calendar);

			const eventCount = (icalString.match(/BEGIN:VEVENT/g) || []).length;
			expect(eventCount).toBe(2);
			expect(icalString).toContain("SUMMARY:Event 1");
			expect(icalString).toContain("SUMMARY:Event 2");
		});
	});
});
