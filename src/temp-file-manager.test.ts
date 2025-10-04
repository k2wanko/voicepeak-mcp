import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { VoicepeakError } from "./errors.js";
import { TempFileManager } from "./temp-file-manager.js";

describe("TempFileManager", () => {
	let manager: TempFileManager;

	beforeEach(() => {
		manager = new TempFileManager();
	});

	afterEach(async () => {
		await manager.cleanupAll();
	});

	test("should create temp file with default prefix", async () => {
		const filePath = await manager.create();

		expect(filePath).toContain(tmpdir());
		expect(filePath).toContain("voicepeak-mcp");
		expect(filePath).toMatch(/\.wav$/);
		expect(manager.fileCount).toBe(1);
	});

	test("should create temp file with custom prefix", async () => {
		const filePath = await manager.create("custom-prefix");

		expect(filePath).toContain("custom-prefix");
		expect(filePath).toMatch(/\.wav$/);
	});

	test("should track multiple temp files", async () => {
		await manager.create();
		await manager.create();
		await manager.create();

		expect(manager.fileCount).toBe(3);
	});

	test("should cleanup temp file", async () => {
		const filePath = await manager.create();

		// Create the actual file
		await fs.writeFile(filePath, "test content");

		// Verify file exists
		const exists = await fs
			.access(filePath)
			.then(() => true)
			.catch(() => false);
		expect(exists).toBe(true);

		// Cleanup
		await manager.cleanup(filePath);

		// File should be deleted
		await expect(fs.access(filePath)).rejects.toThrow();
		expect(manager.fileCount).toBe(0);
	});

	test("should not cleanup non-tracked files", async () => {
		const externalFile = path.join(tmpdir(), "external-file.wav");
		await fs.writeFile(externalFile, "test");

		// Try to cleanup a file not created by this manager
		await manager.cleanup(externalFile);

		// File should still exist
		const exists = await fs
			.access(externalFile)
			.then(() => true)
			.catch(() => false);
		expect(exists).toBe(true);

		// Cleanup
		await fs.unlink(externalFile);
	});

	test("should cleanup all temp files", async () => {
		const files = await Promise.all([
			manager.create(),
			manager.create(),
			manager.create(),
		]);

		// Create actual files
		for (const file of files) {
			await fs.writeFile(file, "test");
		}

		await manager.cleanupAll();

		expect(manager.fileCount).toBe(0);

		// All files should be deleted
		for (const file of files) {
			await expect(fs.access(file)).rejects.toThrow();
		}
	});

	test("should handle cleanup of non-existent file gracefully", async () => {
		const filePath = await manager.create();

		// Don't create the actual file, just track it
		// Cleanup should not throw
		await expect(manager.cleanup(filePath)).resolves.toBeUndefined();
		expect(manager.fileCount).toBe(0);
	});

	test("should ensure file exists", async () => {
		const filePath = await manager.create();

		// File doesn't exist yet
		await expect(manager.ensureExists(filePath)).rejects.toThrow(
			VoicepeakError,
		);

		// Create the file
		await fs.writeFile(filePath, "test");

		// Now it should pass
		await expect(manager.ensureExists(filePath)).resolves.toBeUndefined();
	});

	test("should throw error if path is not a file", async () => {
		const dirPath = path.join(tmpdir(), "test-dir");
		await fs.mkdir(dirPath, { recursive: true });

		await expect(manager.ensureExists(dirPath)).rejects.toThrow(VoicepeakError);

		// Cleanup
		await fs.rmdir(dirPath);
	});

	test("should create unique file names", async () => {
		const file1 = await manager.create();
		const file2 = await manager.create();
		const file3 = await manager.create();

		expect(file1).not.toBe(file2);
		expect(file2).not.toBe(file3);
		expect(file1).not.toBe(file3);
	});
});
