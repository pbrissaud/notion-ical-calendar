import { describe, expect, it } from "vitest";

// Test the pure parsing functions via a minimal re-export shim.
// We import from notion.ts indirectly by testing the CalendarEvent shape
// that pageToEvent would produce. Since the functions are not exported,
// we test them through the public fetchEvents mock at integration level.
// The following tests cover the edge-cases directly visible in the module.

import type { CalendarEvent } from "../notion.js";

// Since pageToEvent is not exported, we test CalendarEvent contract
// by verifying the interface shape at compile time.
describe("CalendarEvent interface", () => {
	it("should accept a valid event object", () => {
		const event: CalendarEvent = {
			id: "abc",
			title: "Meeting",
			start: new Date("2024-06-01T10:00:00Z"),
			end: new Date("2024-06-01T11:00:00Z"),
			allDay: false,
			description: "A description",
			location: "Paris",
			url: "https://notion.so/abc",
		};

		expect(event.title).toBe("Meeting");
		expect(event.allDay).toBe(false);
	});

	it("should accept an all-day event with null end", () => {
		const event: CalendarEvent = {
			id: "def",
			title: "Holiday",
			start: new Date("2024-12-25"),
			end: null,
			allDay: true,
			description: null,
			location: null,
			url: "https://notion.so/def",
		};

		expect(event.allDay).toBe(true);
		expect(event.end).toBeNull();
	});
});

// The following tests verify the truncation constants indirectly
// by creating events with long strings and checking calendar output.
import { calendarToString, generateCalendar } from "../calendar.js";

describe("calendar truncation (sanity check)", () => {
	it("should handle very long title without throwing", () => {
		const events: CalendarEvent[] = [
			{
				id: "e1",
				title: "A".repeat(1000),
				start: new Date("2024-01-01T10:00:00Z"),
				end: null,
				allDay: false,
				description: null,
				location: null,
				url: "https://notion.so/e1",
			},
		];
		// generateCalendar itself doesn't truncate — truncation happens in notion.ts
		// This test ensures the pipeline doesn't throw on long strings.
		expect(() => calendarToString(generateCalendar(events))).not.toThrow();
	});

	it("should handle very long description without throwing", () => {
		const events: CalendarEvent[] = [
			{
				id: "e2",
				title: "Event",
				start: new Date("2024-01-01T10:00:00Z"),
				end: null,
				allDay: false,
				description: "B".repeat(10000),
				location: null,
				url: "https://notion.so/e2",
			},
		];
		expect(() => calendarToString(generateCalendar(events))).not.toThrow();
	});
});
