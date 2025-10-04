import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { VoicepeakError } from "./errors.js";
import { ProcessManager } from "./process-manager.js";

describe("ProcessManager", () => {
	let manager: ProcessManager;

	beforeEach(() => {
		manager = new ProcessManager(); // Use default max concurrent
	});

	afterEach(async () => {
		await manager.cleanup();
	});

	test("should spawn and execute a simple command", async () => {
		const result = await manager.spawn("echo", ["hello world"]);
		expect(result.trim()).toBe("hello world");
	});

	test("should handle command with multiple arguments", async () => {
		const result = await manager.spawn("echo", ["-n", "test"]);
		expect(result).toBe("test");
	});

	test("should track active processes", async () => {
		expect(manager.activeCount).toBe(0);

		const promise = manager.spawn("sleep", ["0.1"]);
		// Process should be active while running
		expect(manager.activeCount).toBe(1);

		await promise;
		// Process should be removed after completion
		expect(manager.activeCount).toBe(0);
	});

	test("should enforce max concurrent processes", async () => {
		// Start 5 concurrent processes (max limit)
		const promises = [
			manager.spawn("sleep", ["0.5"]),
			manager.spawn("sleep", ["0.5"]),
			manager.spawn("sleep", ["0.5"]),
			manager.spawn("sleep", ["0.5"]),
			manager.spawn("sleep", ["0.5"]),
		];

		// Try to start a 6th process, should fail
		await expect(manager.spawn("echo", ["test"])).rejects.toThrow(
			VoicepeakError,
		);

		// Wait for all processes to complete
		await Promise.all(promises);
	});

	test("should timeout long-running processes", async () => {
		await expect(
			manager.spawn("sleep", ["10"], { timeout: 100 }),
		).rejects.toThrow(VoicepeakError);
	}, 10000);

	test("should handle process failures", async () => {
		await expect(manager.spawn("false", [])).rejects.toThrow(VoicepeakError);
	});

	test("should handle non-existent commands", async () => {
		await expect(
			manager.spawn("nonexistent-command-12345", []),
		).rejects.toThrow(VoicepeakError);
	});

	test("should cleanup all active processes", async () => {
		// Start some long-running processes
		const promises = [
			manager.spawn("sleep", ["5"]).catch(() => "terminated"),
			manager.spawn("sleep", ["5"]).catch(() => "terminated"),
		];

		// Wait a bit for processes to start
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(manager.activeCount).toBeGreaterThan(0);

		await manager.cleanup();

		// All processes should be terminated
		expect(manager.activeCount).toBe(0);

		// Wait for all promises to settle
		const results = await Promise.all(promises);

		// All should have been terminated
		expect(results.every((r) => r === "terminated")).toBe(true);
	}, 10000);

	test("should filter debug messages from stderr", async () => {
		// This test assumes we have a command that outputs debug messages
		// For now, we'll test that stderr is included in error messages
		try {
			await manager.spawn("sh", ["-c", 'echo "error" >&2 && exit 1']);
			throw new Error("Should have thrown an error");
		} catch (error) {
			expect(error).toBeInstanceOf(VoicepeakError);
			if (error instanceof VoicepeakError) {
				expect(error.message).toContain("error");
			}
		}
	});

	test("should handle stdin input", async () => {
		const result = await manager.spawn("cat", [], {
			stdin: "test input",
		});
		expect(result).toBe("test input");
	});
});
