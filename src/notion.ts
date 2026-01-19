import { Client } from "@notionhq/client";
import type {
	PageObjectResponse,
	QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints.js";
import type { Config } from "./config.js";

export interface CalendarEvent {
	id: string;
	title: string;
	start: Date;
	end: Date | null;
	allDay: boolean;
	description: string | null;
	location: string | null;
	url: string;
}

type PropertyValue = PageObjectResponse["properties"][string];

function getPropertyValue(
	properties: PageObjectResponse["properties"],
	name: string,
): PropertyValue | undefined {
	return properties[name];
}

function extractTitle(property: PropertyValue | undefined): string {
	if (!property || property.type !== "title") {
		return "Untitled";
	}
	return property.title.map((t) => t.plain_text).join("") || "Untitled";
}

function extractDate(property: PropertyValue | undefined): {
	start: Date;
	end: Date | null;
	allDay: boolean;
} | null {
	if (!property || property.type !== "date" || !property.date) {
		return null;
	}

	const { start, end } = property.date;

	const hasTime = start.includes("T");
	const startDate = new Date(start);

	let endDate: Date | null = null;
	if (end) {
		endDate = new Date(end);
	}

	return {
		start: startDate,
		end: endDate,
		allDay: !hasTime,
	};
}

function extractRichText(property: PropertyValue | undefined): string | null {
	if (!property || property.type !== "rich_text") {
		return null;
	}
	const text = property.rich_text.map((t) => t.plain_text).join("");
	return text || null;
}

function pageToEvent(
	page: PageObjectResponse,
	propertyNames: Config["propertyNames"],
): CalendarEvent | null {
	const titleProp = getPropertyValue(page.properties, propertyNames.title);
	const dateProp = getPropertyValue(page.properties, propertyNames.date);

	const dateInfo = extractDate(dateProp);
	if (!dateInfo) {
		return null;
	}

	let description: string | null = null;
	if (propertyNames.description) {
		const descProp = getPropertyValue(
			page.properties,
			propertyNames.description,
		);
		description = extractRichText(descProp);
	}

	let location: string | null = null;
	if (propertyNames.location) {
		const locProp = getPropertyValue(page.properties, propertyNames.location);
		location = extractRichText(locProp);
	}

	return {
		id: page.id,
		title: extractTitle(titleProp),
		start: dateInfo.start,
		end: dateInfo.end,
		allDay: dateInfo.allDay,
		description,
		location,
		url: page.url,
	};
}

export class NotionCalendarClient {
	private client: Client;
	private databaseId: string;
	private propertyNames: Config["propertyNames"];

	constructor(config: Config) {
		this.client = new Client({ auth: config.notionApiKey });
		this.databaseId = config.notionDatabaseId;
		this.propertyNames = config.propertyNames;
	}

	async fetchEvents(): Promise<CalendarEvent[]> {
		const events: CalendarEvent[] = [];
		let cursor: string | undefined = undefined;

		do {
			const response: QueryDatabaseResponse = await this.client.databases.query(
				{
					database_id: this.databaseId,
					start_cursor: cursor,
					filter: {
						property: this.propertyNames.date,
						date: {
							is_not_empty: true,
						},
					},
					sorts: [
						{
							property: this.propertyNames.date,
							direction: "ascending",
						},
					],
				},
			);

			for (const page of response.results) {
				if ("properties" in page) {
					const event = pageToEvent(
						page as PageObjectResponse,
						this.propertyNames,
					);
					if (event) {
						events.push(event);
					}
				}
			}

			cursor = response.has_more
				? (response.next_cursor ?? undefined)
				: undefined;
		} while (cursor);

		return events;
	}
}
