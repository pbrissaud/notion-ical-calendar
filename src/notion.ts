import type {
	DatabaseObjectResponse,
	PageObjectResponse,
	QueryDataSourceResponse,
} from "@notionhq/client";
import { Client } from "@notionhq/client";
import type { Config } from "./config.js";

const MAX_PAGES = 50; // ~5000 events max at page_size 100
const MAX_LEN_TITLE = 500;
const MAX_LEN_TEXT = 8000;

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

function truncate(value: string, maxLen: number): string {
	return value.length > maxLen ? value.slice(0, maxLen) : value;
}

function getPropertyValue(
	properties: PageObjectResponse["properties"],
	name: string,
): PropertyValue | undefined {
	return properties[name];
}

function findTitleProperty(
	properties: PageObjectResponse["properties"],
): PropertyValue | undefined {
	for (const prop of Object.values(properties)) {
		if (prop.type === "title") {
			return prop;
		}
	}
	return undefined;
}

function extractTitle(property: PropertyValue | undefined): string {
	if (!property || property.type !== "title") {
		return "Untitled";
	}
	const raw = property.title.map((t) => t.plain_text).join("") || "Untitled";
	return truncate(raw, MAX_LEN_TITLE);
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
	return text ? truncate(text, MAX_LEN_TEXT) : null;
}

function pageToEvent(
	page: PageObjectResponse,
	propertyNames: Config["propertyNames"],
): CalendarEvent | null {
	const titleProp = findTitleProperty(page.properties);
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
	private dataSourceId: string | null = null;

	constructor(config: Config) {
		this.client = new Client({ auth: config.notionApiKey });
		this.databaseId = config.notionDatabaseId;
		this.propertyNames = config.propertyNames;
	}

	private async resolveDataSourceId(): Promise<string> {
		if (this.dataSourceId) return this.dataSourceId;

		const db = await this.client.databases.retrieve({
			database_id: this.databaseId,
		});

		const fullDb = db as DatabaseObjectResponse;
		const firstSource = fullDb.data_sources[0];
		if (!firstSource) {
			throw new Error(
				`No data sources found for database ${this.databaseId}. Make sure the integration has access.`,
			);
		}

		this.dataSourceId = firstSource.id;
		return this.dataSourceId;
	}

	async fetchEvents(): Promise<CalendarEvent[]> {
		const dataSourceId = await this.resolveDataSourceId();
		const events: CalendarEvent[] = [];
		let cursor: string | undefined;
		let pageCount = 0;

		do {
			const response: QueryDataSourceResponse =
				await this.client.dataSources.query({
					data_source_id: dataSourceId,
					start_cursor: cursor,
					result_type: "page",
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
				});

			pageCount++;

			for (const page of response.results) {
				if ("properties" in page && page.object === "page") {
					const event = pageToEvent(
						page as PageObjectResponse,
						this.propertyNames,
					);
					if (event) {
						events.push(event);
					}
				}
			}

			if (pageCount >= MAX_PAGES && response.has_more) {
				console.warn(
					`[warn] Notion pagination limit reached (${MAX_PAGES} pages, ~${events.length} events). Results are truncated.`,
				);
				break;
			}

			cursor = response.has_more
				? (response.next_cursor ?? undefined)
				: undefined;
		} while (cursor);

		return events;
	}
}
