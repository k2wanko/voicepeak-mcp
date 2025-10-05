import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { type DictionaryEntry, DictionaryManager } from "./dictionary.js";

describe.skipIf(process.platform === "win32")("DictionaryManager", () => {
	let manager: DictionaryManager;

	beforeEach(async () => {
		// Create a temporary test directory for dictionary
		const testDir = path.join(tmpdir(), "voicepeak-dict-test");
		await fs.mkdir(testDir, { recursive: true });

		// Create a manager instance
		// Note: We can't easily override the singleton's path, so we'll
		// create a new instance for testing
		manager = new DictionaryManager();
	});

	afterEach(async () => {
		// Clean up test files if they exist
		try {
			const testDir = path.dirname(manager.getPath());
			await fs.rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore errors if directory doesn't exist
		}
	});

	test("should read dictionary successfully", async () => {
		const entries = await manager.readDictionary();
		expect(Array.isArray(entries)).toBe(true);
	});

	test("should add a new entry to dictionary", async () => {
		const entry: DictionaryEntry = {
			sur: "TypeScript",
			pron: "タイプスクリプト",
		};

		await manager.addEntry(entry);

		const entries = await manager.readDictionary();
		expect(entries).toHaveLength(1);
		expect(entries[0]?.sur).toBe("TypeScript");
		expect(entries[0]?.pron).toBe("タイプスクリプト");
		expect(entries[0]?.lang).toBe("ja"); // Default value
		expect(entries[0]?.priority).toBe(5); // Default value
	});

	test("should update existing entry", async () => {
		const entry1: DictionaryEntry = {
			sur: "MCP",
			pron: "エムシーピー",
		};

		await manager.addEntry(entry1);

		const entry2: DictionaryEntry = {
			sur: "MCP",
			pron: "モデルコンテクストプロトコル",
			priority: 10,
		};

		await manager.addEntry(entry2);

		const entries = await manager.readDictionary();
		expect(entries).toHaveLength(1);
		expect(entries[0]?.pron).toBe("モデルコンテクストプロトコル");
		expect(entries[0]?.priority).toBe(10);
	});

	test("should remove an entry from dictionary", async () => {
		const entry: DictionaryEntry = {
			sur: "VOICEPEAK",
			pron: "ボイスピーク",
		};

		await manager.addEntry(entry);

		const removed = await manager.removeEntry("VOICEPEAK");
		expect(removed).toBe(true);

		const entries = await manager.readDictionary();
		expect(entries).toHaveLength(0);
	});

	test("should return false when removing non-existent entry", async () => {
		const removed = await manager.removeEntry("NonExistent");
		expect(removed).toBe(false);
	});

	test("should find entries by surface form", async () => {
		const entry1: DictionaryEntry = {
			sur: "Claude",
			pron: "クロード",
		};

		const entry2: DictionaryEntry = {
			sur: "Bun",
			pron: "バン",
		};

		await manager.addEntry(entry1);
		await manager.addEntry(entry2);

		const found = await manager.findEntry("Claude");
		expect(found).toHaveLength(1);
		expect(found[0]?.pron).toBe("クロード");
	});

	test("should return empty array when entry not found", async () => {
		const found = await manager.findEntry("NotExists");
		expect(found).toEqual([]);
	});

	test("should clear all entries", async () => {
		const entry1: DictionaryEntry = {
			sur: "Test1",
			pron: "テスト1",
		};

		const entry2: DictionaryEntry = {
			sur: "Test2",
			pron: "テスト2",
		};

		await manager.addEntry(entry1);
		await manager.addEntry(entry2);

		await manager.clearDictionary();

		const entries = await manager.readDictionary();
		expect(entries).toEqual([]);
	});

	test("should handle multiple entries with same surface but different language", async () => {
		const entry1: DictionaryEntry = {
			sur: "Test",
			pron: "テスト",
			lang: "ja",
		};

		const entry2: DictionaryEntry = {
			sur: "Test",
			pron: "Tesuto",
			lang: "en",
		};

		await manager.addEntry(entry1);
		await manager.addEntry(entry2);

		const entries = await manager.readDictionary();
		expect(entries).toHaveLength(2);
	});

	test("should normalize entries with default values", async () => {
		const entry: DictionaryEntry = {
			sur: "MinimalEntry",
			pron: "ミニマル",
		};

		await manager.addEntry(entry);

		const entries = await manager.readDictionary();
		expect(entries[0]).toBeDefined();
		const firstEntry = entries[0];
		if (firstEntry) {
			expect(firstEntry).toMatchObject({
				sur: "MinimalEntry",
				pron: "ミニマル",
				pos: "Japanese_Futsuu_meishi",
				priority: 5,
				accentType: 0,
				lang: "ja",
			});
		}
	});

	test("should preserve custom values", async () => {
		const entry: DictionaryEntry = {
			sur: "CustomEntry",
			pron: "カスタム",
			pos: "Japanese_Koyuu_meishi",
			priority: 8,
			accentType: 1,
			lang: "ja",
		};

		await manager.addEntry(entry);

		const entries = await manager.readDictionary();
		expect(entries[0]).toBeDefined();
		const firstEntry = entries[0];
		if (firstEntry) {
			expect(firstEntry).toMatchObject(entry);
		}
	});

	test("should get dictionary path", () => {
		const path = manager.getPath();
		expect(path).toMatch(/dic\.json$/);
	});
});
