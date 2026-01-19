import ical, { type ICalCalendar } from "ical-generator";
import type { CalendarEvent } from "./notion.js";

export function generateCalendar(events: CalendarEvent[]): ICalCalendar {
	const calendar = ical({
		name: "Notion Calendar",
		prodId: {
			company: "notion-ical-calendar",
			product: "notion-ical-calendar",
		},
	});

	for (const event of events) {
		const icalEvent = calendar.createEvent({
			id: event.id,
			summary: event.title,
			start: event.start,
			allDay: event.allDay,
			url: event.url,
		});

		if (event.end) {
			if (event.allDay) {
				// iCal DTEND is exclusive for all-day events, so add 1 day
				const endDate = new Date(event.end);
				endDate.setDate(endDate.getDate() + 1);
				icalEvent.end(endDate);
			} else {
				icalEvent.end(event.end);
			}
		} else if (event.allDay) {
			const endDate = new Date(event.start);
			endDate.setDate(endDate.getDate() + 1);
			icalEvent.end(endDate);
		}

		if (event.description) {
			icalEvent.description(event.description);
		}

		if (event.location) {
			icalEvent.location(event.location);
		}
	}

	return calendar;
}

export function calendarToString(calendar: ICalCalendar): string {
	return calendar.toString();
}
