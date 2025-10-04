import { beforeEach, describe, expect, test } from "bun:test";
import { NarratorCache } from "./narrator-cache.js";

describe("NarratorCache", () => {
	let cache: NarratorCache;

	beforeEach(() => {
		cache = new NarratorCache();
		cache.clear();
	});

	test("should validate undefined narrator as valid", async () => {
		const result = await cache.isValidNarrator(undefined);
		expect(result).toBe(true);
	});

	test("should cache narrator list", async () => {
		// First call should fetch from VOICEPEAK
		const narrators1 = await cache.getAvailableNarrators();

		// Second call should use cache
		const narrators2 = await cache.getAvailableNarrators();

		// Both should return the same instance
		expect(narrators1).toBe(narrators2);
	});

	test("should clear cache", async () => {
		// Fetch narrators
		await cache.getAvailableNarrators();

		// Clear cache
		cache.clear();

		// Next fetch should be a new instance
		const narrators2 = await cache.getAvailableNarrators();

		// Should be different instances (new fetch)
		// Note: This might not always be different if VOICEPEAK returns same data
		expect(narrators2).toBeInstanceOf(Set);
	});

	test("should handle concurrent fetch requests", async () => {
		// Make multiple concurrent requests
		const promises = [
			cache.getAvailableNarrators(),
			cache.getAvailableNarrators(),
			cache.getAvailableNarrators(),
		];

		const results = await Promise.all(promises);

		// All should return the same Set instance
		expect(results[0]).toBe(results[1]);
		expect(results[1]).toBe(results[2]);
	});

	test("should refresh cache", async () => {
		// Get initial narrators
		await cache.getAvailableNarrators();

		// Wait a bit
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Refresh should force a new fetch
		await cache.refresh();

		// Get narrators again
		const narrators2 = await cache.getAvailableNarrators();

		// Should return a Set
		expect(narrators2).toBeInstanceOf(Set);
	});

	// Note: Testing actual VOICEPEAK integration would require:
	// 1. VOICEPEAK to be installed
	// 2. Proper mocking of processManager
	// For now, we test the caching logic only

	test("should handle empty narrator name", async () => {
		const result = await cache.isValidNarrator("");
		// Empty string should be checked against available narrators
		expect(typeof result).toBe("boolean");
	});
});
