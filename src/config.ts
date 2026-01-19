export interface Config {
	notionApiKey: string;
	notionDatabaseId: string;
	port: number;
	cacheTtl: number;
	propertyNames: {
		title: string;
		date: string;
		description: string | null;
		location: string | null;
	};
}

function getRequiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function getOptionalEnv(name: string, defaultValue: string): string {
	return process.env[name] || defaultValue;
}

function getOptionalEnvOrNull(name: string): string | null {
	return process.env[name] || null;
}

function getNumericEnv(name: string, defaultValue: number): number {
	const value = process.env[name];
	if (!value) {
		return defaultValue;
	}
	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed)) {
		throw new Error(`Environment variable ${name} must be a number`);
	}
	return parsed;
}

export function loadConfig(): Config {
	return {
		notionApiKey: getRequiredEnv("NOTION_API_KEY"),
		notionDatabaseId: getRequiredEnv("NOTION_DATABASE_ID"),
		port: getNumericEnv("PORT", 3000),
		cacheTtl: getNumericEnv("CACHE_TTL", 300),
		propertyNames: {
			title: getOptionalEnv("NOTION_PROPERTY_TITLE", "Name"),
			date: getOptionalEnv("NOTION_PROPERTY_DATE", "Date"),
			description: getOptionalEnvOrNull("NOTION_PROPERTY_DESCRIPTION"),
			location: getOptionalEnvOrNull("NOTION_PROPERTY_LOCATION"),
		},
	};
}
