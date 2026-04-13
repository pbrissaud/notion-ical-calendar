import { createHash, timingSafeEqual } from "node:crypto";
import type { Server } from "node:http";
import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import { calendarToString, generateCalendar } from "./calendar.js";
import type { Config } from "./config.js";
import { NotionCalendarClient } from "./notion.js";

interface CacheEntry {
	data: string;
	etag: string;
	timestamp: number;
}

export class CalendarServer {
	private server: Server;
	private notionClient: NotionCalendarClient;
	private cache: CacheEntry | null = null;
	private cacheTtl: number;
	private calendarToken: string | null;
	private pending: Promise<string> | null = null;

	constructor(config: Config) {
		this.notionClient = new NotionCalendarClient(config);
		this.cacheTtl = config.cacheTtl * 1000;
		this.calendarToken = config.calendarToken;
		this.server = createServer(this.handleRequest.bind(this));
	}

	private async handleRequest(
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		const url = new URL(
			req.url ?? "/",
			`http://${req.headers.host ?? "localhost"}`,
		);
		const path = url.pathname;

		try {
			if (path === "/health") {
				this.handleHealth(res);
			} else if (this.isCalendarPath(path)) {
				await this.handleCalendar(req, res);
			} else {
				this.handleNotFound(res);
			}
		} catch (error) {
			this.handleError(res, error);
		}
	}

	private isCalendarPath(path: string): boolean {
		if (this.calendarToken === null) {
			return path === "/calendar.ics";
		}
		const prefix = "/calendar/";
		const suffix = ".ics";
		if (!path.startsWith(prefix) || !path.endsWith(suffix)) {
			return false;
		}
		const provided = path.slice(prefix.length, -suffix.length);
		if (provided.length !== this.calendarToken.length) {
			return false;
		}
		return timingSafeEqual(
			Buffer.from(provided),
			Buffer.from(this.calendarToken),
		);
	}

	private handleHealth(res: ServerResponse): void {
		res.writeHead(200, { "Content-Type": "text/plain" });
		res.end("OK");
	}

	private async handleCalendar(
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		const icalData = await this.getCalendarData();
		const etag = this.cache?.etag ?? computeEtag(icalData);
		const lastModified = this.cache
			? new Date(this.cache.timestamp).toUTCString()
			: new Date().toUTCString();

		const ifNoneMatch = req.headers["if-none-match"];
		if (ifNoneMatch === etag) {
			res.writeHead(304);
			res.end();
			return;
		}

		res.writeHead(200, {
			"Content-Type": "text/calendar; charset=utf-8",
			"Content-Disposition": 'attachment; filename="calendar.ics"',
			"Cache-Control": `public, max-age=${Math.floor(this.cacheTtl / 1000)}`,
			ETag: etag,
			"Last-Modified": lastModified,
		});
		res.end(icalData);
	}

	private handleNotFound(res: ServerResponse): void {
		res.writeHead(404, { "Content-Type": "text/plain" });
		res.end("Not Found");
	}

	private handleError(res: ServerResponse, error: unknown): void {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("Request error:", message);
		res.writeHead(500, { "Content-Type": "text/plain" });
		res.end("Internal Server Error");
	}

	private async getCalendarData(): Promise<string> {
		const now = Date.now();

		if (this.cache && now - this.cache.timestamp < this.cacheTtl) {
			return this.cache.data;
		}

		if (this.pending) {
			return this.pending;
		}

		this.pending = this.fetchAndCache().finally(() => {
			this.pending = null;
		});

		return this.pending;
	}

	private async fetchAndCache(): Promise<string> {
		try {
			const events = await this.notionClient.fetchEvents();
			const calendar = generateCalendar(events);
			const icalData = calendarToString(calendar);
			const etag = computeEtag(icalData);

			this.cache = {
				data: icalData,
				etag,
				timestamp: Date.now(),
			};

			return icalData;
		} catch (error) {
			if (this.cache) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				console.warn(
					"[warn] Notion fetch failed, serving stale cache:",
					message,
				);
				return this.cache.data;
			}
			throw error;
		}
	}

	start(port: number): Promise<void> {
		return new Promise((resolve) => {
			this.server.listen(port, () => {
				console.log(`Server listening on port ${port}`);
				if (this.calendarToken) {
					console.log(
						`Calendar feed: http://localhost:${port}/calendar/${this.calendarToken}.ics`,
					);
				} else {
					console.log(`Calendar feed: http://localhost:${port}/calendar.ics`);
				}
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

function computeEtag(data: string): string {
	return `"${createHash("sha1").update(data).digest("hex")}"`;
}
