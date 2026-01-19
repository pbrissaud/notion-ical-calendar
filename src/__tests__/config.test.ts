import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../config.js";

describe("config", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("loadConfig", () => {
		it("should load required environment variables", () => {
			process.env.NOTION_API_KEY = "test-api-key";
			process.env.NOTION_DATABASE_ID = "test-database-id";

			const config = loadConfig();

			expect(config.notionApiKey).toBe("test-api-key");
			expect(config.notionDatabaseId).toBe("test-database-id");
		});

		it("should use default values for optional variables", () => {
			process.env.NOTION_API_KEY = "test-api-key";
			process.env.NOTION_DATABASE_ID = "test-database-id";

			const config = loadConfig();

			expect(config.port).toBe(3000);
			expect(config.cacheTtl).toBe(300);
			expect(config.propertyNames.title).toBe("Name");
			expect(config.propertyNames.date).toBe("Date");
			expect(config.propertyNames.description).toBeNull();
			expect(config.propertyNames.location).toBeNull();
		});

		it("should override defaults with environment variables", () => {
			process.env.NOTION_API_KEY = "test-api-key";
			process.env.NOTION_DATABASE_ID = "test-database-id";
			process.env.PORT = "8080";
			process.env.CACHE_TTL = "600";
			process.env.NOTION_PROPERTY_TITLE = "Event Name";
			process.env.NOTION_PROPERTY_DATE = "Event Date";
			process.env.NOTION_PROPERTY_DESCRIPTION = "Description";
			process.env.NOTION_PROPERTY_LOCATION = "Location";

			const config = loadConfig();

			expect(config.port).toBe(8080);
			expect(config.cacheTtl).toBe(600);
			expect(config.propertyNames.title).toBe("Event Name");
			expect(config.propertyNames.date).toBe("Event Date");
			expect(config.propertyNames.description).toBe("Description");
			expect(config.propertyNames.location).toBe("Location");
		});

		it("should throw error when NOTION_API_KEY is missing", () => {
			process.env.NOTION_DATABASE_ID = "test-database-id";
			process.env.NOTION_API_KEY = undefined;

			expect(() => loadConfig()).toThrow(
				"Missing required environment variable: NOTION_API_KEY",
			);
		});

		it("should throw error when NOTION_DATABASE_ID is missing", () => {
			process.env.NOTION_API_KEY = "test-api-key";
			process.env.NOTION_DATABASE_ID = undefined;

			expect(() => loadConfig()).toThrow(
				"Missing required environment variable: NOTION_DATABASE_ID",
			);
		});

		it("should throw error when PORT is not a number", () => {
			process.env.NOTION_API_KEY = "test-api-key";
			process.env.NOTION_DATABASE_ID = "test-database-id";
			process.env.PORT = "invalid";

			expect(() => loadConfig()).toThrow(
				"Environment variable PORT must be a number",
			);
		});
	});
});
