import { loadConfig } from "./config.js";
import { CalendarServer } from "./server.js";

async function main(): Promise<void> {
	const config = loadConfig();
	const server = new CalendarServer(config);

	const shutdown = async (signal: string) => {
		console.log(`\nReceived ${signal}, shutting down...`);
		await server.stop();
		process.exit(0);
	};

	process.on("SIGINT", () => shutdown("SIGINT"));
	process.on("SIGTERM", () => shutdown("SIGTERM"));

	await server.start(config.port);
}

main().catch((error) => {
	console.error("Failed to start server:", error);
	process.exit(1);
});
