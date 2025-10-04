import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { CONFIG } from "./types.js";
import {
	sanitizeEmotionKey,
	sanitizeText,
	ValidationError,
	validateAudioFilePath,
	validateEmotionParams,
	validateOutputPath,
	validatePitch,
	validateSpeed,
} from "./validators.js";

describe("sanitizeText", () => {
	test("should sanitize valid text", () => {
		const result = sanitizeText("Hello, world!");
		expect(result).toBe("Hello, world!");
	});

	test("should remove control characters", () => {
		const result = sanitizeText("Hello\x00\x1F\x7Fworld");
		expect(result).toBe("Helloworld");
	});

	test("should remove shell metacharacters", () => {
		const result = sanitizeText("Hello `$()<>|&\\ world");
		expect(result).toBe("Hello world");
	});

	test("should normalize whitespace", () => {
		const result = sanitizeText("Hello    world  \n  test");
		expect(result).toBe("Hello world test");
	});

	test("should throw error for empty text", () => {
		expect(() => sanitizeText("")).toThrow(ValidationError);
	});

	test("should throw error for text too long", () => {
		const longText = "a".repeat(5001);
		expect(() => sanitizeText(longText)).toThrow(ValidationError);
	});

	test("should allow Japanese characters", () => {
		const result = sanitizeText("こんにちは、世界！");
		expect(result).toBe("こんにちは、世界！");
	});
});

describe("sanitizeEmotionKey", () => {
	test("should allow valid emotion key", () => {
		const result = sanitizeEmotionKey("happy");
		expect(result).toBe("happy");
	});

	test("should allow underscore in key", () => {
		const result = sanitizeEmotionKey("very_happy");
		expect(result).toBe("very_happy");
	});

	test("should remove invalid characters", () => {
		const result = sanitizeEmotionKey("happy-sad");
		expect(result).toBe("happysad");
	});

	test("should throw error for empty key after sanitization", () => {
		expect(() => sanitizeEmotionKey("---")).toThrow(ValidationError);
	});
});

describe("validateEmotionParams", () => {
	test("should return undefined for undefined input", () => {
		const result = validateEmotionParams(undefined);
		expect(result).toBeUndefined();
	});

	test("should validate emotion parameters", () => {
		const result = validateEmotionParams({ happy: 50, sad: 30 });
		expect(result).toEqual({ happy: 50, sad: 30 });
	});

	test("should clamp values to min/max", () => {
		const result = validateEmotionParams({ happy: 150, sad: -10 });
		expect(result).toEqual({
			happy: CONFIG.VOICEPEAK.EMOTION.MAX,
			sad: CONFIG.VOICEPEAK.EMOTION.MIN,
		});
	});

	test("should sanitize emotion keys", () => {
		const result = validateEmotionParams({ "happy-sad": 50 });
		expect(result).toEqual({ happysad: 50 });
	});
});

describe("validateSpeed", () => {
	test("should return default speed for undefined", () => {
		const result = validateSpeed(undefined);
		expect(result).toBe(CONFIG.VOICEPEAK.SPEED.DEFAULT);
	});

	test("should validate speed within range", () => {
		const result = validateSpeed(120);
		expect(result).toBe(120);
	});

	test("should clamp speed to minimum", () => {
		const result = validateSpeed(30);
		expect(result).toBe(CONFIG.VOICEPEAK.SPEED.MIN);
	});

	test("should clamp speed to maximum", () => {
		const result = validateSpeed(250);
		expect(result).toBe(CONFIG.VOICEPEAK.SPEED.MAX);
	});
});

describe("validatePitch", () => {
	test("should return default pitch for undefined", () => {
		const result = validatePitch(undefined);
		expect(result).toBe(CONFIG.VOICEPEAK.PITCH.DEFAULT);
	});

	test("should validate pitch within range", () => {
		const result = validatePitch(100);
		expect(result).toBe(100);
	});

	test("should clamp pitch to minimum", () => {
		const result = validatePitch(-400);
		expect(result).toBe(CONFIG.VOICEPEAK.PITCH.MIN);
	});

	test("should clamp pitch to maximum", () => {
		const result = validatePitch(400);
		expect(result).toBe(CONFIG.VOICEPEAK.PITCH.MAX);
	});
});

describe("validateAudioFilePath", () => {
	let testDir: string;
	let testFile: string;

	beforeAll(async () => {
		testDir = path.join(tmpdir(), "voicepeak-test");
		await fs.mkdir(testDir, { recursive: true });
	});

	beforeEach(async () => {
		// Create a valid WAV file for testing
		testFile = path.join(testDir, "test.wav");
		const wavHeader = Buffer.alloc(44);
		// RIFF header
		wavHeader.write("RIFF", 0);
		wavHeader.writeUInt32LE(36, 4); // ChunkSize
		wavHeader.write("WAVE", 8);
		// fmt chunk
		wavHeader.write("fmt ", 12);
		wavHeader.writeUInt32LE(16, 16); // Subchunk1Size
		wavHeader.writeUInt16LE(1, 20); // AudioFormat (PCM)
		wavHeader.writeUInt16LE(2, 22); // NumChannels
		wavHeader.writeUInt32LE(44100, 24); // SampleRate
		wavHeader.writeUInt32LE(176400, 28); // ByteRate
		wavHeader.writeUInt16LE(4, 32); // BlockAlign
		wavHeader.writeUInt16LE(16, 34); // BitsPerSample
		// data chunk
		wavHeader.write("data", 36);
		wavHeader.writeUInt32LE(0, 40); // Subchunk2Size

		await fs.writeFile(testFile, wavHeader);
	});

	test("should validate correct WAV file", async () => {
		const result = await validateAudioFilePath(testFile);
		expect(result).toBe(path.resolve(testFile));
	});

	test("should throw error for non-existent file", async () => {
		await expect(
			validateAudioFilePath(path.join(testDir, "nonexistent.wav")),
		).rejects.toThrow(ValidationError);
	});

	test("should throw error for invalid file extension", async () => {
		const invalidFile = path.join(testDir, "test.mp3");
		await fs.writeFile(invalidFile, "test");

		await expect(validateAudioFilePath(invalidFile)).rejects.toThrow(
			ValidationError,
		);

		await fs.unlink(invalidFile);
	});

	test("should throw error for invalid WAV format", async () => {
		const invalidWav = path.join(testDir, "invalid.wav");
		await fs.writeFile(invalidWav, "not a wav file");

		await expect(validateAudioFilePath(invalidWav)).rejects.toThrow(
			ValidationError,
		);

		await fs.unlink(invalidWav);
	});

	test("should throw error for path traversal attempt", async () => {
		// Try to access a file outside allowed directories
		const outsideFile = "/etc/passwd";
		await expect(validateAudioFilePath(outsideFile)).rejects.toThrow(
			ValidationError,
		);
	});
});

describe("validateOutputPath", () => {
	test("should return undefined for undefined input", () => {
		const result = validateOutputPath(undefined);
		expect(result).toBeUndefined();
	});

	test("should return path within temp directory", () => {
		const tempPath = path.join(tmpdir(), "test.wav");
		const result = validateOutputPath(tempPath);
		expect(result).toBe(path.resolve(tempPath));
	});

	test("should move path to temp directory if outside", () => {
		const outsidePath = "/etc/test.wav";
		const result = validateOutputPath(outsidePath);
		expect(result).toMatch(new RegExp(`^${path.resolve(tmpdir())}`));
		expect(result).toContain("test.wav");
	});

	test("should sanitize filename", () => {
		const unsafePath = "/etc/test$file.wav";
		const result = validateOutputPath(unsafePath);
		expect(result).toMatch(/test.*file\.wav$/);
	});
});
