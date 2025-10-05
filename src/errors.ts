// Error handling utilities

export type ErrorCode =
	// Validation errors
	| "INVALID_TEXT"
	| "INVALID_NARRATOR"
	| "INVALID_FILE_PATH"
	| "PATH_TRAVERSAL_ATTEMPT"
	// Process errors
	| "PROCESS_TIMEOUT"
	| "PROCESS_FAILED"
	| "TOO_MANY_PROCESSES"
	| "SYNTHESIS_FAILED"
	// File system errors
	| "FILE_NOT_FOUND"
	| "FILE_WRITE_ERROR"
	| "TEMP_FILE_ERROR"
	// Queue errors
	| "QUEUE_CLEARED"
	// Platform errors
	| "UNSUPPORTED_PLATFORM"
	// Unknown errors
	| "UNKNOWN_ERROR";

export const ErrorCode = {
	// Validation errors
	INVALID_TEXT: "INVALID_TEXT" as const,
	INVALID_NARRATOR: "INVALID_NARRATOR" as const,
	INVALID_FILE_PATH: "INVALID_FILE_PATH" as const,
	PATH_TRAVERSAL_ATTEMPT: "PATH_TRAVERSAL_ATTEMPT" as const,
	// Process errors
	PROCESS_TIMEOUT: "PROCESS_TIMEOUT" as const,
	PROCESS_FAILED: "PROCESS_FAILED" as const,
	TOO_MANY_PROCESSES: "TOO_MANY_PROCESSES" as const,
	SYNTHESIS_FAILED: "SYNTHESIS_FAILED" as const,
	// File system errors
	FILE_NOT_FOUND: "FILE_NOT_FOUND" as const,
	FILE_WRITE_ERROR: "FILE_WRITE_ERROR" as const,
	TEMP_FILE_ERROR: "TEMP_FILE_ERROR" as const,
	// Queue errors
	QUEUE_CLEARED: "QUEUE_CLEARED" as const,
	// Platform errors
	UNSUPPORTED_PLATFORM: "UNSUPPORTED_PLATFORM" as const,
	// Unknown errors
	UNKNOWN_ERROR: "UNKNOWN_ERROR" as const,
} as const;

export class VoicepeakError extends Error {
	constructor(
		message: string,
		public readonly code: ErrorCode,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "VoicepeakError";
	}
}

export interface ErrorResponse {
	content: Array<{ type: "text"; text: string }>;
}

export function handleToolError(error: unknown): ErrorResponse {
	// Log error for debugging
	console.error("[VoicePeak MCP] Error:", error);

	if (error instanceof VoicepeakError) {
		return {
			content: [
				{
					type: "text",
					text: `Error [${error.code}]: ${error.message}`,
				},
			],
		};
	}

	if (error instanceof Error) {
		// Hide internal details from user
		const sanitizedMessage = error.message
			.replace(/\/[^\s]+/g, "[path]") // Hide file paths
			.substring(0, 200); // Limit message length

		return {
			content: [
				{
					type: "text",
					text: `Error: ${sanitizedMessage}`,
				},
			],
		};
	}

	return {
		content: [
			{
				type: "text",
				text: "An unexpected error occurred. Please try again.",
			},
		],
	};
}
