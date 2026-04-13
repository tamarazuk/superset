import { afterEach, describe, expect, it, mock } from "bun:test";
import type { RefObject } from "react";

const actualReact: typeof import("react") = await import("react");

let currentHookIndex = 0;
let hookRefState: unknown[] = [];
let pendingLayoutEffects: Array<() => void> = [];

const mockUseRef = (<T>(initialValue: T): RefObject<T> => {
	const hookIndex = currentHookIndex++;
	const existingRef = hookRefState[hookIndex] as RefObject<T> | undefined;
	if (existingRef) {
		return existingRef;
	}

	const ref = { current: initialValue };
	hookRefState[hookIndex] = ref;
	return ref;
}) as typeof actualReact.useRef;

const mockUseLayoutEffect = ((effect: () => void | (() => void)) => {
	pendingLayoutEffects.push(() => {
		effect();
	});
}) as typeof actualReact.useLayoutEffect;

mock.module("react", () => ({
	...actualReact,
	useLayoutEffect: mockUseLayoutEffect,
	useRef: mockUseRef,
}));

const { useConversationScrollPreservation } = await import(
	"./useConversationScrollPreservation"
);

function useRenderedHook(
	params: Parameters<typeof useConversationScrollPreservation>[0],
	{ commit = true }: { commit?: boolean } = {},
) {
	currentHookIndex = 0;
	const result = useConversationScrollPreservation(params);

	if (commit) {
		const effectsToRun = pendingLayoutEffects;
		pendingLayoutEffects = [];
		for (const effect of effectsToRun) {
			effect();
		}
	}

	return result;
}

afterEach(() => {
	currentHookIndex = 0;
	hookRefState = [];
	pendingLayoutEffects = [];
});

describe("useConversationScrollPreservation", () => {
	it("keeps the conversation mounted through a transient reset in the same session", () => {
		useRenderedHook({
			hasConversationContent: true,
			isAwaitingAssistant: false,
			isConversationLoading: false,
			sessionId: "session-1",
		});

		const result = useRenderedHook({
			hasConversationContent: false,
			isAwaitingAssistant: false,
			isConversationLoading: false,
			sessionId: "session-1",
		});

		expect(result.shouldShowConversationLoading).toBe(false);
		expect(result.shouldShowEmptyState).toBe(false);
		expect(result.scrollPreservationProps).toEqual({
			preserveScrollOnTransientReset: true,
			scrollRestoreKey: "session-1",
		});
	});

	it("resets the latch when the session changes", () => {
		useRenderedHook({
			hasConversationContent: true,
			isAwaitingAssistant: false,
			isConversationLoading: false,
			sessionId: "session-1",
		});

		const result = useRenderedHook({
			hasConversationContent: false,
			isAwaitingAssistant: false,
			isConversationLoading: false,
			sessionId: "session-2",
		});

		expect(result.shouldShowConversationLoading).toBe(false);
		expect(result.shouldShowEmptyState).toBe(true);
		expect(result.scrollPreservationProps).toEqual({
			preserveScrollOnTransientReset: true,
			scrollRestoreKey: "session-2",
		});
	});

	it("latches content immediately when a new session already has content", () => {
		useRenderedHook({
			hasConversationContent: true,
			isAwaitingAssistant: false,
			isConversationLoading: false,
			sessionId: "session-1",
		});

		useRenderedHook({
			hasConversationContent: true,
			isAwaitingAssistant: false,
			isConversationLoading: false,
			sessionId: "session-2",
		});

		const result = useRenderedHook({
			hasConversationContent: false,
			isAwaitingAssistant: false,
			isConversationLoading: false,
			sessionId: "session-2",
		});

		expect(result.shouldShowConversationLoading).toBe(false);
		expect(result.shouldShowEmptyState).toBe(false);
	});

	it("does not persist content from an abandoned render", () => {
		useRenderedHook(
			{
				hasConversationContent: true,
				isAwaitingAssistant: false,
				isConversationLoading: false,
				sessionId: "session-1",
			},
			{ commit: false },
		);

		const result = useRenderedHook({
			hasConversationContent: false,
			isAwaitingAssistant: false,
			isConversationLoading: false,
			sessionId: "session-1",
		});

		expect(result.shouldShowConversationLoading).toBe(false);
		expect(result.shouldShowEmptyState).toBe(true);
	});
});
