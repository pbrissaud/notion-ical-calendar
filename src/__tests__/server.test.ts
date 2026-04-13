import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Config } from "../config.js";
import { CalendarServer } from "../server.js";

vi.mock("../notion.js", () => ({
	// biome-ignore lint/complexity/useArrowFunction: must be a regular function so `new` can call it as a constructor
	NotionCalendarClient: vi.fn().mockImplementation(function () {
		return {
			fetchEvents: vi.fn().mockResolvedValue([
				{
					id: "test-event-1",
					title: "Test Event",
					start: new Date("2024-01-15T10:00:00Z"),
					end: new Date("2024-01-15T11:00:00Z"),
					allDay: false,
					description: "Test description",
					location: "Test location",
					url: "https://notion.so/test-event-1",
				},
			]),
		};
	}),
}));

const testConfig: Config = {
	notionApiKey: "test-api-key",
	notionDatabaseId: "test-database-id",
	calendarToken: null,
	port: 0,
	cacheTtl: 300,
	propertyNames: {
		title: "Name",
		date: "Date",
		description: "Description",
		location: "Location",
	},
};

describe("CalendarServer", () => {
	let server: CalendarServer;
	let baseUrl: string;

	beforeAll(async () => {
		server = new CalendarServer(testConfig);
		await server.start(0);

		const address = (
			server as unknown as { server: { address: () => { port: number } } }
		).server.address();
		const port = typeof address === "object" && address ? address.port : 0;
		baseUrl = `http://localhost:${port}`;
	});

	afterAll(async () => {
		await server.stop();
	});

	describe("GET /health", () => {
		it("should return 200 OK", async () => {
			const response = await fetch(`${baseUrl}/health`);

			expect(response.status).toBe(200);
			expect(await response.text()).toBe("OK");
		});

		it("should have text/plain content type", async () => {
			const response = await fetch(`${baseUrl}/health`);

			expect(response.headers.get("content-type")).toBe("text/plain");
		});
	});

	describe("GET /calendar.ics", () => {
		it("should return 200 with iCal content", async () => {
			const response = await fetch(`${baseUrl}/calendar.ics`);

			expect(response.status).toBe(200);
			const body = await response.text();
			expect(body).toContain("BEGIN:VCALENDAR");
			expect(body).toContain("END:VCALENDAR");
		});

		it("should have correct content type", async () => {
			const response = await fetch(`${baseUrl}/calendar.ics`);

			expect(response.headers.get("content-type")).toBe(
				"text/calendar; charset=utf-8",
			);
		});

		it("should have content disposition header", async () => {
			const response = await fetch(`${baseUrl}/calendar.ics`);

			expect(response.headers.get("content-disposition")).toBe(
				'attachment; filename="calendar.ics"',
			);
		});

		it("should include event from Notion", async () => {
			const response = await fetch(`${baseUrl}/calendar.ics`);
			const body = await response.text();

			expect(body).toContain("SUMMARY:Test Event");
			expect(body).toContain("DESCRIPTION:Test description");
			expect(body).toContain("LOCATION:Test location");
		});
	});

	describe("GET /unknown", () => {
		it("should return 404 for unknown paths", async () => {
			const response = await fetch(`${baseUrl}/unknown`);

			expect(response.status).toBe(404);
			expect(await response.text()).toBe("Not Found");
		});
	});

	describe("HTTP cache headers", () => {
		it("should include Cache-Control header", async () => {
			const response = await fetch(`${baseUrl}/calendar.ics`);
			expect(response.headers.get("cache-control")).toMatch(/public.*max-age/);
		});

		it("should include ETag header", async () => {
			const response = await fetch(`${baseUrl}/calendar.ics`);
			expect(response.headers.get("etag")).toBeTruthy();
		});

		it("should return 304 when If-None-Match matches ETag", async () => {
			const first = await fetch(`${baseUrl}/calendar.ics`);
			const etag = first.headers.get("etag") ?? "";

			const second = await fetch(`${baseUrl}/calendar.ics`, {
				headers: { "If-None-Match": etag },
			});

			expect(second.status).toBe(304);
		});
	});
});

describe("CalendarServer with token", () => {
	let server: CalendarServer;
	let baseUrl: string;

	const TOKEN = "test-secret-token";

	beforeAll(async () => {
		server = new CalendarServer({ ...testConfig, calendarToken: TOKEN });
		await server.start(0);

		const address = (
			server as unknown as { server: { address: () => { port: number } } }
		).server.address();
		const port = typeof address === "object" && address ? address.port : 0;
		baseUrl = `http://localhost:${port}`;
	});

	afterAll(async () => {
		await server.stop();
	});

	it("should return 200 for the correct token path", async () => {
		const response = await fetch(`${baseUrl}/calendar/${TOKEN}.ics`);
		expect(response.status).toBe(200);
		const body = await response.text();
		expect(body).toContain("BEGIN:VCALENDAR");
	});

	it("should return 404 for wrong token", async () => {
		const response = await fetch(`${baseUrl}/calendar/wrong-token.ics`);
		expect(response.status).toBe(404);
	});

	it("should return 404 for bare /calendar.ics when token is set", async () => {
		const response = await fetch(`${baseUrl}/calendar.ics`);
		expect(response.status).toBe(404);
	});
});
