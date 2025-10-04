import { describe, expect, test } from "bun:test";
import { ErrorCode, VoicepeakError } from "./errors.js";
import { SynthesisQueue } from "./synthesis-queue.js";

describe("SynthesisQueue", () => {
	test("should process single item", async () => {
		const queue = new SynthesisQueue();
		const result = await queue.addToQueue(async () => "test result");

		expect(result).toBe("test result");
	});

	test("should process items sequentially", async () => {
		const queue = new SynthesisQueue();
		const executionOrder: number[] = [];

		const promises = [
			queue.addToQueue(async () => {
				await new Promise((resolve) => setTimeout(resolve, 50));
				executionOrder.push(1);
				return "result1";
			}),
			queue.addToQueue(async () => {
				executionOrder.push(2);
				return "result2";
			}),
			queue.addToQueue(async () => {
				executionOrder.push(3);
				return "result3";
			}),
		];

		const results = await Promise.all(promises);

		expect(results).toEqual(["result1", "result2", "result3"]);
		expect(executionOrder).toEqual([1, 2, 3]);
	});

	test("should handle errors in queue items", async () => {
		const queue = new SynthesisQueue();

		const promise1 = queue.addToQueue(async () => {
			throw new Error("test error");
		});

		const promise2 = queue.addToQueue(async () => "success");

		await expect(promise1).rejects.toThrow("test error");
		await expect(promise2).resolves.toBe("success");
	});

	test("should report queue status", async () => {
		const queue = new SynthesisQueue();

		// Initially empty
		expect(queue.getStatus()).toEqual({
			queueLength: 0,
			isProcessing: false,
		});

		// Add items to queue
		const promise1 = queue.addToQueue(async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return "result1";
		});

		const promise2 = queue.addToQueue(async () => "result2");
		const promise3 = queue.addToQueue(async () => "result3");

		// Check status while processing
		await new Promise((resolve) => setTimeout(resolve, 10));
		const status = queue.getStatus();
		expect(status.isProcessing).toBe(true);

		// Wait for all to complete
		await Promise.all([promise1, promise2, promise3]);

		// Should be empty again
		expect(queue.getStatus()).toEqual({
			queueLength: 0,
			isProcessing: false,
		});
	});

	test("should clear queue and reject pending items", async () => {
		const queue = new SynthesisQueue();

		// Add a long-running task
		const promise1 = queue.addToQueue(async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return "result1";
		});

		// Wait a bit for first item to start
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Add more items that will be queued
		const promise2 = queue.addToQueue(async () => "result2");
		const promise3 = queue.addToQueue(async () => "result3");

		// Clear the queue
		queue.clear();

		// Queued items should be rejected
		let error2: unknown;
		let error3: unknown;

		try {
			await promise2;
		} catch (e) {
			error2 = e;
		}

		try {
			await promise3;
		} catch (e) {
			error3 = e;
		}

		// Check errors
		expect(error2).toBeInstanceOf(VoicepeakError);
		expect(error3).toBeInstanceOf(VoicepeakError);
		expect((error2 as VoicepeakError).code).toBe(ErrorCode.QUEUE_CLEARED);
		expect((error3 as VoicepeakError).code).toBe(ErrorCode.QUEUE_CLEARED);

		// The first item should still complete (already started)
		await expect(promise1).resolves.toBe("result1");
	}, 10000);

	test("should handle concurrent additions to queue", async () => {
		const queue = new SynthesisQueue();
		const results: string[] = [];

		// Add multiple items concurrently
		const promises = Array.from({ length: 10 }, (_, i) =>
			queue.addToQueue(async () => {
				const result = `result${i}`;
				results.push(result);
				return result;
			}),
		);

		await Promise.all(promises);

		expect(results).toHaveLength(10);
		// All items should have been processed
		expect(new Set(results).size).toBe(10);
	});

	test("should process empty queue without errors", async () => {
		const queue = new SynthesisQueue();

		// Should handle status check on empty queue
		const status = queue.getStatus();
		expect(status.queueLength).toBe(0);
		expect(status.isProcessing).toBe(false);

		// Should handle clear on empty queue
		expect(() => queue.clear()).not.toThrow();
	});

	test("should handle rapid sequential additions", async () => {
		const queue = new SynthesisQueue();

		// Add items rapidly one after another
		const promise1 = queue.addToQueue(async () => "result1");
		const promise2 = queue.addToQueue(async () => "result2");
		const promise3 = queue.addToQueue(async () => "result3");

		const results = await Promise.all([promise1, promise2, promise3]);
		expect(results).toEqual(["result1", "result2", "result3"]);
	});
});
