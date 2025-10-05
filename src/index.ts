import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { type DictionaryEntry, dictionaryManager } from "./dictionary.js";
import { ErrorCode, handleToolError, VoicepeakError } from "./errors.js";
import { narratorCache } from "./narrator-cache.js";
import {
	getPlayArgs,
	getPlayCommand,
	getVoicepeakPath,
	setPlayCommand,
	setVoicepeakPath,
} from "./os.js";
import { processManager } from "./process-manager.js";
import { synthesisQueue } from "./synthesis-queue.js";
import { tempFileManager } from "./temp-file-manager.js";
import {
	CONFIG,
	type ListEmotionsOptions,
	type PlayOptions,
	type SynthesizeOptions,
} from "./types.js";
import {
	sanitizeText,
	ValidationError,
	validateAudioFilePath,
	validateEmotionParams,
	validateOutputPath,
	validatePitch,
	validateSpeed,
} from "./validators.js";

// VOICEPEAK CLI wrapper with validation
async function runVoicePeak(args: string[]): Promise<string> {
	return processManager.spawn(getVoicepeakPath(), args);
}

// Safe audio playback with validation
async function playAudio(filePath: string): Promise<void> {
	const validatedPath = await validateAudioFilePath(filePath);
	await processManager.spawn(getPlayCommand(), getPlayArgs(validatedPath));
}

// Safe synthesis with all validations and queue/retry logic
async function synthesizeSafe(options: SynthesizeOptions): Promise<string> {
	// Validate all inputs
	const sanitizedText = sanitizeText(options.text);

	if (
		options.narrator &&
		!(await narratorCache.isValidNarrator(options.narrator))
	) {
		throw new ValidationError(
			`Invalid narrator: ${options.narrator}`,
			"INVALID_NARRATOR",
		);
	}

	const validatedEmotion = validateEmotionParams(options.emotion);
	const validatedSpeed = validateSpeed(options.speed);
	const validatedPitch = validatePitch(options.pitch);
	const validatedOutputPath = validateOutputPath(options.outputPath);

	// Create safe output path
	const outputFile = validatedOutputPath || (await tempFileManager.create());

	// Build safe command arguments
	const voicepeakArgs = ["-s", sanitizedText, "-o", outputFile];

	if (options.narrator) {
		voicepeakArgs.push("-n", options.narrator);
	}

	if (validatedEmotion && Object.keys(validatedEmotion).length > 0) {
		const emotionStr = Object.entries(validatedEmotion)
			.map(([key, value]) => `${key}=${value}`)
			.join(",");
		voicepeakArgs.push("-e", emotionStr);
	}

	if (validatedSpeed !== CONFIG.VOICEPEAK.SPEED.DEFAULT) {
		voicepeakArgs.push("--speed", validatedSpeed.toString());
	}

	if (validatedPitch !== CONFIG.VOICEPEAK.PITCH.DEFAULT) {
		voicepeakArgs.push("--pitch", validatedPitch.toString());
	}

	// Execute synthesis through queue with retry logic
	const execute = async (): Promise<string> => {
		const MAX_RETRIES = 5;
		const RETRY_DELAY = 1000; // 1 second

		for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
			try {
				await runVoicePeak(voicepeakArgs);
				// Ensure file was created
				await tempFileManager.ensureExists(outputFile);
				return outputFile;
			} catch (error) {
				console.error(
					`[VoicePeak MCP] Synthesis failed (attempt ${attempt}/${MAX_RETRIES}):`,
					error,
				);

				if (attempt === MAX_RETRIES) {
					throw new VoicepeakError(
						`Failed to synthesize after ${MAX_RETRIES} attempts: ${error}`,
						ErrorCode.SYNTHESIS_FAILED,
					);
				}

				// Wait before retrying
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
			}
		}

		// Should never reach here, but TypeScript needs this
		throw new VoicepeakError(
			"Unexpected error in synthesis retry logic",
			ErrorCode.SYNTHESIS_FAILED,
		);
	};

	// Add to queue for sequential processing
	return synthesisQueue.addToQueue(execute);
}

// Initialize MCP server
const server = new Server(
	{
		name: "voicepeak-mcp",
		version: "1.0.0",
	},
	{
		capabilities: {
			tools: {},
		},
	},
);

// Tool definitions with proper types
const tools: Tool[] = [
	{
		name: "synthesize",
		description:
			"Synthesize speech from text using VOICEPEAK (max 140 characters per synthesis)",
		inputSchema: {
			type: "object",
			properties: {
				text: {
					type: "string",
					description: "Text to synthesize (max 140 characters)",
				},
				narrator: {
					type: "string",
					description: "Narrator name (e.g., 'Tohoku Zunko', 'Zundamon')",
				},
				emotion: {
					type: "object",
					description: "Emotion parameters (e.g., {happy: 50, sad: 50})",
					additionalProperties: {
						type: "number",
						minimum: 0,
						maximum: 100,
					},
				},
				speed: {
					type: "number",
					description: "Speech speed (50-200)",
					minimum: 50,
					maximum: 200,
					default: 100,
				},
				pitch: {
					type: "number",
					description: "Speech pitch (-300 to 300)",
					minimum: -300,
					maximum: 300,
					default: 0,
				},
				outputPath: {
					type: "string",
					description:
						"Optional output file path. If not specified, a temporary file will be created",
				},
			},
			required: ["text"],
		},
	},
	{
		name: "play",
		description: "Play a synthesized audio file",
		inputSchema: {
			type: "object",
			properties: {
				filePath: {
					type: "string",
					description: "Path to the audio file to play",
				},
			},
			required: ["filePath"],
		},
	},
	{
		name: "synthesize_and_play",
		description:
			"Synthesize speech from text and immediately play it (max 140 characters per synthesis)",
		inputSchema: {
			type: "object",
			properties: {
				text: {
					type: "string",
					description: "Text to synthesize and play (max 140 characters)",
				},
				narrator: {
					type: "string",
					description: "Narrator name",
				},
				emotion: {
					type: "object",
					description: "Emotion parameters",
					additionalProperties: {
						type: "number",
						minimum: 0,
						maximum: 100,
					},
				},
				speed: {
					type: "number",
					description: "Speech speed (50-200)",
					minimum: 50,
					maximum: 200,
					default: 100,
				},
				pitch: {
					type: "number",
					description: "Speech pitch (-300 to 300)",
					minimum: -300,
					maximum: 300,
					default: 0,
				},
			},
			required: ["text"],
		},
	},
	{
		name: "list_narrators",
		description: "List all available narrators",
		inputSchema: {
			type: "object",
			properties: {},
		},
	},
	{
		name: "list_emotions",
		description: "List available emotions for a narrator",
		inputSchema: {
			type: "object",
			properties: {
				narrator: {
					type: "string",
					description: "Narrator name",
				},
			},
			required: ["narrator"],
		},
	},
	{
		name: "dictionary_list",
		description: "List all dictionary entries",
		inputSchema: {
			type: "object",
			properties: {},
		},
	},
	{
		name: "dictionary_add",
		description: "Add or update a dictionary entry for custom pronunciation",
		inputSchema: {
			type: "object",
			properties: {
				surface: {
					type: "string",
					description: "The text to be replaced",
				},
				pronunciation: {
					type: "string",
					description: "The pronunciation in Japanese kana",
				},
				priority: {
					type: "number",
					description: "Priority (0-10, default: 5)",
					minimum: 0,
					maximum: 10,
				},
			},
			required: ["surface", "pronunciation"],
		},
	},
	{
		name: "dictionary_remove",
		description: "Remove a dictionary entry",
		inputSchema: {
			type: "object",
			properties: {
				surface: {
					type: "string",
					description: "The text to remove from dictionary",
				},
			},
			required: ["surface"],
		},
	},
	{
		name: "dictionary_find",
		description: "Find dictionary entries by surface form",
		inputSchema: {
			type: "object",
			properties: {
				surface: {
					type: "string",
					description: "The text to search for",
				},
			},
			required: ["surface"],
		},
	},
	{
		name: "dictionary_clear",
		description: "Clear all dictionary entries",
		inputSchema: {
			type: "object",
			properties: {},
		},
	},
];

// Register tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: tools,
	};
});

// Handle tool execution with proper error handling
server.setRequestHandler(
	CallToolRequestSchema,
	async (
		request,
	): Promise<{
		content: Array<{ type: "text"; text: string }>;
	}> => {
		const { name, arguments: args } = request.params;

		try {
			switch (name) {
				case "synthesize": {
					const options = args as unknown as SynthesizeOptions;
					const outputFile = await synthesizeSafe(options);

					return {
						content: [
							{
								type: "text",
								text: `Speech synthesized successfully. Output file: ${outputFile}`,
							},
						],
					};
				}

				case "play": {
					const options = args as unknown as PlayOptions;
					await playAudio(options.filePath);

					return {
						content: [
							{
								type: "text",
								text: `Audio played successfully: ${options.filePath}`,
							},
						],
					};
				}

				case "synthesize_and_play": {
					const options = args as unknown as SynthesizeOptions;
					const outputFile = await synthesizeSafe(options);

					try {
						await playAudio(outputFile);
						return {
							content: [
								{
									type: "text",
									text: "Speech synthesized and played successfully",
								},
							],
						};
					} finally {
						// Clean up temp file after playback
						await tempFileManager.cleanup(outputFile);
					}
				}

				case "list_narrators": {
					const output = await runVoicePeak(["--list-narrator"]);
					const narrators = output
						.split("\n")
						.filter((line) => line.trim() && !line.includes("[debug]"))
						.map((line) => line.trim());

					return {
						content: [
							{
								type: "text",
								text: `Available narrators:\n${narrators.join("\n")}`,
							},
						],
					};
				}

				case "list_emotions": {
					const options = args as unknown as ListEmotionsOptions;

					// Validate narrator
					if (!(await narratorCache.isValidNarrator(options.narrator))) {
						throw new ValidationError(
							`Invalid narrator: ${options.narrator}`,
							"INVALID_NARRATOR",
						);
					}

					const output = await runVoicePeak([
						"--list-emotion",
						options.narrator,
					]);
					const emotions = output
						.split("\n")
						.filter((line) => line.trim() && !line.includes("[debug]"))
						.map((line) => line.trim());

					return {
						content: [
							{
								type: "text",
								text: `Available emotions for ${options.narrator}:\n${emotions.join("\n")}`,
							},
						],
					};
				}

				case "dictionary_list": {
					if (process.platform === "win32") {
						throw new VoicepeakError(
							"Windows does not support dictionary management via MCP. Please use the VOICEPEAK application to manage pronunciation dictionary.",
							ErrorCode.UNSUPPORTED_PLATFORM,
						);
					}

					const entries = await dictionaryManager.readDictionary();
					if (entries.length === 0) {
						return {
							content: [
								{
									type: "text",
									text: "No dictionary entries found.",
								},
							],
						};
					}

					const formatted = entries
						.map(
							(e) =>
								`- ${e.sur} → ${e.pron} (priority: ${e.priority}, lang: ${e.lang})`,
						)
						.join("\n");

					return {
						content: [
							{
								type: "text",
								text: `Dictionary entries (${entries.length}):\n${formatted}`,
							},
						],
					};
				}

				case "dictionary_add": {
					if (process.platform === "win32") {
						throw new VoicepeakError(
							"Windows does not support dictionary management via MCP. Please use the VOICEPEAK application to manage pronunciation dictionary.",
							ErrorCode.UNSUPPORTED_PLATFORM,
						);
					}

					const { surface, pronunciation, priority } = args as {
						surface: string;
						pronunciation: string;
						priority?: number;
					};

					const entry: DictionaryEntry = {
						sur: surface,
						pron: pronunciation,
						priority: priority ?? 5,
					};

					await dictionaryManager.addEntry(entry);

					return {
						content: [
							{
								type: "text",
								text: `Dictionary entry added/updated: ${surface} → ${pronunciation}`,
							},
						],
					};
				}

				case "dictionary_remove": {
					if (process.platform === "win32") {
						throw new VoicepeakError(
							"Windows does not support dictionary management via MCP. Please use the VOICEPEAK application to manage pronunciation dictionary.",
							ErrorCode.UNSUPPORTED_PLATFORM,
						);
					}

					const { surface } = args as { surface: string };
					const removed = await dictionaryManager.removeEntry(surface);

					if (removed) {
						return {
							content: [
								{
									type: "text",
									text: `Dictionary entry removed: ${surface}`,
								},
							],
						};
					}

					return {
						content: [
							{
								type: "text",
								text: `No dictionary entry found for: ${surface}`,
							},
						],
					};
				}

				case "dictionary_find": {
					if (process.platform === "win32") {
						throw new VoicepeakError(
							"Windows does not support dictionary management via MCP. Please use the VOICEPEAK application to manage pronunciation dictionary.",
							ErrorCode.UNSUPPORTED_PLATFORM,
						);
					}

					const { surface } = args as { surface: string };
					const entries = await dictionaryManager.findEntry(surface);

					if (entries.length === 0) {
						return {
							content: [
								{
									type: "text",
									text: `No dictionary entries found for: ${surface}`,
								},
							],
						};
					}

					const formatted = entries
						.map(
							(e) =>
								`- ${e.sur} → ${e.pron} (priority: ${e.priority}, lang: ${e.lang})`,
						)
						.join("\n");

					return {
						content: [
							{
								type: "text",
								text: `Found ${entries.length} entries:\n${formatted}`,
							},
						],
					};
				}

				case "dictionary_clear": {
					if (process.platform === "win32") {
						throw new VoicepeakError(
							"Windows does not support dictionary management via MCP. Please use the VOICEPEAK application to manage pronunciation dictionary.",
							ErrorCode.UNSUPPORTED_PLATFORM,
						);
					}

					await dictionaryManager.clearDictionary();
					return {
						content: [
							{
								type: "text",
								text: "Dictionary cleared successfully.",
							},
						],
					};
				}

				default:
					throw new VoicepeakError(
						`Unknown tool: ${name}`,
						ErrorCode.UNKNOWN_ERROR,
					);
			}
		} catch (error) {
			return handleToolError(error);
		}
	},
);

// Parse command line arguments
function parseCommandLineArgs() {
	const args = process.argv.slice(2);

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--voicepeak-path" && i + 1 < args.length) {
			const path = args[i + 1];
			if (path) {
				setVoicepeakPath(path);
			}
			i++; // Skip next argument
		} else if (arg === "--play-command" && i + 1 < args.length) {
			const command = args[i + 1];
			if (command) {
				setPlayCommand(command);
			}
			i++; // Skip next argument
		} else if (arg === "--help" || arg === "-h") {
			console.error(`
VOICEPEAK MCP Server

Usage: voicepeak-mcp [options]

Options:
  --voicepeak-path <path>    Path to VOICEPEAK executable
  --play-command <command>   Command to play audio files
  --help, -h                 Show this help message

Environment Variables:
  VOICEPEAK_PATH             Path to VOICEPEAK executable
  VOICEPEAK_PLAY_COMMAND     Command to play audio files

Priority: command line arguments > environment variables > platform defaults
`);
			process.exit(0);
		}
	}
}

// Main server startup
async function main() {
	parseCommandLineArgs();

	const transport = new StdioServerTransport();
	await server.connect(transport);
	// No console output in production to avoid stdio interference
}

// Start server with proper error handling
main().catch((error) => {
	console.error("[VoicePeak MCP] Fatal error:", error);
	process.exit(1);
});
