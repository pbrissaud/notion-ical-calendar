import {
	type IncomingMessage,
	type ServerResponse,
	createServer,
} from "node:http";
import type { Server } from "node:http";
import { calendarToString, generateCalendar } from "./calendar.js";
import type { Config } from "./config.js";
import { NotionCalendarClient } from "./notion.js";

interface CacheEntry {
	data: string;
	timestamp: number;
}

export class CalendarServer {
	private server: Server;
	private notionClient: NotionCalendarClient;
	private cache: CacheEntry | null = null;
	private cacheTtl: number;

	constructor(config: Config) {
		this.notionClient = new NotionCalendarClient(config);
		this.cacheTtl = config.cacheTtl * 1000;
		this.server = createServer(this.handleRequest.bind(this));
	}

	private async handleRequest(
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		const url = new URL(req.url || "/", `http://${req.headers.host}`);
		const path = url.pathname;

		try {
			if (path === "/health") {
				this.handleHealth(res);
			} else if (path === "/calendar.ics") {
				await this.handleCalendar(res);
			} else {
				this.handleNotFound(res);
			}
		} catch (error) {
			this.handleError(res, error);
		}
	}

	private handleHealth(res: ServerResponse): void {
		res.writeHead(200, { "Content-Type": "text/plain" });
		res.end("OK");
	}

	private async handleCalendar(res: ServerResponse): Promise<void> {
		const icalData = await this.getCalendarData();
		res.writeHead(200, {
			"Content-Type": "text/calendar; charset=utf-8",
			"Content-Disposition": 'attachment; filename="calendar.ics"',
		});
		res.end(icalData);
	}

	private handleNotFound(res: ServerResponse): void {
		res.writeHead(404, { "Content-Type": "text/plain" });
		res.end("Not Found");
	}

	private handleError(res: ServerResponse, error: unknown): void {
		console.error("Request error:", error);
		res.writeHead(500, { "Content-Type": "text/plain" });
		res.end("Internal Server Error");
	}

	private async getCalendarData(): Promise<string> {
		const now = Date.now();

		if (this.cache && now - this.cache.timestamp < this.cacheTtl) {
			return this.cache.data;
		}

		const events = await this.notionClient.fetchEvents();
		const calendar = generateCalendar(events);
		const icalData = calendarToString(calendar);

		this.cache = {
			data: icalData,
			timestamp: now,
		};

		return icalData;
	}

	start(port: number): Promise<void> {
		return new Promise((resolve) => {
			this.server.listen(port, () => {
				console.log(`Server listening on port ${port}`);
				console.log(`Calendar feed: http://localhost:${port}/calendar.ics`);
				console.log(`Health check: http://localhost:${port}/health`);
				resolve();
			});
		});
	}

	stop(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server.close((err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}
}
