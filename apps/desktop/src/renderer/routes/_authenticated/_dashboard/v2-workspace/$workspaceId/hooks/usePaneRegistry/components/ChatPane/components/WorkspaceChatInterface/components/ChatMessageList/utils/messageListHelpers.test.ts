import { describe, expect, it } from "bun:test";
import {
	getVisibleMessages,
	resolvePendingPlanToolCallId,
} from "./messageListHelpers";

function message(id: string, role: "user" | "assistant") {
	return {
		id,
		role,
		content: [{ type: "text" as const, text: `msg-${id}` }],
		createdAt: new Date("2026-03-30T00:00:00.000Z"),
	} as never;
}

describe("getVisibleMessages", () => {
	it("returns messages unchanged when not streaming", () => {
		const messages = [message("u1", "user"), message("a1", "assistant")];
		const result = getVisibleMessages({
			messages,
			isRunning: false,
			currentMessage: null,
		});

		expect(result).toBe(messages);
	});

	it("returns messages unchanged while streaming (filtering handled upstream by useChatDisplay)", () => {
		const messages = [
			message("u1", "user"),
			message("a1", "assistant"),
			message("u2", "user"),
		];
		const result = getVisibleMessages({
			messages,
			isRunning: true,
			currentMessage: message("a-current", "assistant"),
		});

		expect(result).toBe(messages);
		expect(result).toHaveLength(3);
	});

	it("returns the same array reference (no unnecessary allocations)", () => {
		const messages = [message("u1", "user")];
		const result = getVisibleMessages({
			messages,
			isRunning: true,
			currentMessage: message("a-current", "assistant"),
		});

		expect(result).toBe(messages);
	});
});

describe("resolvePendingPlanToolCallId", () => {
	it("prefers explicit toolCallId when provided", () => {
		const result = resolvePendingPlanToolCallId({
			pendingPlanApproval: {
				toolCallId: "tool-call-explicit",
				planId: "plan-1",
			} as never,
			fallbackToolCallId: "tool-call-fallback",
		});

		expect(result).toBe("tool-call-explicit");
	});

	it("returns matching planId when it matches fallback", () => {
		const result = resolvePendingPlanToolCallId({
			pendingPlanApproval: {
				planId: "tool-call-fallback",
			} as never,
			fallbackToolCallId: "tool-call-fallback",
		});

		expect(result).toBe("tool-call-fallback");
	});

	it("falls back when no explicit id is available", () => {
		const result = resolvePendingPlanToolCallId({
			pendingPlanApproval: {
				title: "Approval required",
			} as never,
			fallbackToolCallId: "tool-call-fallback",
		});

		expect(result).toBe("tool-call-fallback");
	});
});
