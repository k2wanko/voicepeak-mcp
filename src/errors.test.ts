import { describe, expect, test } from "bun:test";
import {
	ErrorCode,
	type ErrorResponse,
	handleToolError,
	VoicepeakError,
} from "./errors.js";

describe("VoicepeakError", () => {
	test("should create error with code", () => {
		const error = new VoicepeakError("Test error", ErrorCode.INVALID_TEXT);

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("VoicepeakError");
		expect(error.message).toBe("Test error");
		expect(error.code).toBe(ErrorCode.INVALID_TEXT);
	});

	test("should create error with details", () => {
		const details = { foo: "bar" };
		const error = new VoicepeakError(
			"Test error",
			ErrorCode.PROCESS_FAILED,
			details,
		);

		expect(error.details).toEqual(details);
	});

	test("should support all error codes", () => {
		const codes: ErrorCode[] = [
			ErrorCode.INVALID_TEXT,
			ErrorCode.INVALID_NARRATOR,
			ErrorCode.INVALID_FILE_PATH,
			ErrorCode.PATH_TRAVERSAL_ATTEMPT,
			ErrorCode.PROCESS_TIMEOUT,
			ErrorCode.PROCESS_FAILED,
			ErrorCode.TOO_MANY_PROCESSES,
			ErrorCode.SYNTHESIS_FAILED,
			ErrorCode.FILE_NOT_FOUND,
			ErrorCode.FILE_WRITE_ERROR,
			ErrorCode.TEMP_FILE_ERROR,
			ErrorCode.QUEUE_CLEARED,
			ErrorCode.UNKNOWN_ERROR,
		];

		for (const code of codes) {
			const error = new VoicepeakError("Test", code);
			expect(error.code).toBe(code);
		}
	});
});

describe("handleToolError", () => {
	test("should handle VoicepeakError", () => {
		const error = new VoicepeakError("Test error", ErrorCode.INVALID_TEXT);
		const result = handleToolError(error);

		expect(result).toMatchObject({
			content: [
				{
					type: "text",
					text: "Error [INVALID_TEXT]: Test error",
				},
			],
		} satisfies ErrorResponse);
	});

	test("should handle generic Error", () => {
		const error = new Error("Generic error");
		const result = handleToolError(error);

		expect(result.content).toHaveLength(1);
		expect(result.content[0]?.type).toBe("text");
		expect(result.content[0]?.text).toContain("Error:");
	});

	test("should sanitize file paths in error messages", () => {
		const error = new Error("File not found: /home/user/secret/path.txt");
		const result = handleToolError(error);

		expect(result.content[0]?.text).toContain("[path]");
		expect(result.content[0]?.text).not.toContain("/home/user/secret");
	});

	test("should limit error message length", () => {
		const longMessage = "a".repeat(300);
		const error = new Error(longMessage);
		const result = handleToolError(error);

		expect(result.content[0]?.text.length).toBeLessThanOrEqual(210); // "Error: " + 200 chars
	});

	test("should handle unknown error types", () => {
		const error = "string error";
		const result = handleToolError(error);

		expect(result.content[0]?.text).toBe(
			"An unexpected error occurred. Please try again.",
		);
	});

	test("should handle null error", () => {
		const result = handleToolError(null);

		expect(result.content[0]?.text).toBe(
			"An unexpected error occurred. Please try again.",
		);
	});

	test("should handle undefined error", () => {
		const result = handleToolError(undefined);

		expect(result.content[0]?.text).toBe(
			"An unexpected error occurred. Please try again.",
		);
	});
});
