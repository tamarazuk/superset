import { afterEach, describe, expect, it, mock } from "bun:test";
import type {
	DependencyList,
	EffectCallback,
	ReactNode,
	RefObject,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";

type ScrollListener = () => void;

type MockScrollElement = {
	addEventListener: (
		event: string,
		listener: EventListenerOrEventListenerObject,
		options?: AddEventListenerOptions,
	) => void;
	removeEventListener: (
		event: string,
		listener: EventListenerOrEventListenerObject,
		options?: EventListenerOptions,
	) => void;
	clientHeight: number;
	scrollHeight: number;
	scrollTop: number;
};

type StickToBottomRenderContext = Record<string, never>;
type StickToBottomProps = {
	children?: ReactNode | ((context: StickToBottomRenderContext) => ReactNode);
};

const observeCalls: Element[] = [];
const contentElement = {} as Element;
const actualReact: typeof import("react") = await import("react");
let currentScrollListener: (() => void) | null = null;
let currentResizeObserverCallback: ResizeObserverCallback | null = null;
let currentHookIndex = 0;
let currentIsAtBottom = false;
let hookRefState: unknown[] = [];
let effectState: Array<{
	deps: DependencyList | undefined;
	cleanup?: (() => void) | undefined;
}> = [];

const scrollElement: MockScrollElement = {
	addEventListener: (_event, listener) => {
		currentScrollListener = listener as ScrollListener;
	},
	clientHeight: 200,
	removeEventListener: (_event, listener) => {
		if (currentScrollListener === listener) {
			currentScrollListener = null;
		}
	},
	scrollHeight: 400,
	scrollTop: 0,
};

class MockResizeObserver implements ResizeObserver {
	constructor(readonly callback: ResizeObserverCallback) {
		currentResizeObserverCallback = callback;
	}

	observe(target: Element) {
		observeCalls.push(target);
	}

	unobserve(_target: Element) {}

	disconnect() {}
}

const mockUseCallback = (<T extends (...args: never[]) => unknown>(fn: T) =>
	fn) as typeof actualReact.useCallback;
const mockUseEffect = ((effect: EffectCallback, deps?: DependencyList) => {
	const hookIndex = currentHookIndex++;
	const previousEffectState = effectState[hookIndex];
	const hasChanged =
		!previousEffectState ||
		!deps ||
		!previousEffectState.deps ||
		deps.length !== previousEffectState.deps.length ||
		deps.some((dep, index) => dep !== previousEffectState.deps?.[index]);

	if (!hasChanged) {
		return;
	}

	previousEffectState?.cleanup?.();
	const cleanup = effect() ?? undefined;
	effectState[hookIndex] = {
		cleanup,
		deps,
	};
}) as typeof actualReact.useEffect;
const mockUseRef = (<T,>(initialValue: T): RefObject<T> => {
	const hookIndex = currentHookIndex++;
	const existingRef = hookRefState[hookIndex] as RefObject<T> | undefined;
	if (existingRef) {
		return existingRef;
	}

	const ref = { current: initialValue };
	hookRefState[hookIndex] = ref;
	return ref;
}) as typeof actualReact.useRef;
const MockStickToBottom = Object.assign(
	({ children }: StickToBottomProps) =>
		typeof children === "function" ? children({}) : children,
	{
		Content: ({ children }: { children?: ReactNode }) => children,
	},
);

mock.module("react", () => ({
	...actualReact,
	useCallback: mockUseCallback,
	useEffect: mockUseEffect,
	useRef: mockUseRef,
}));

mock.module("use-stick-to-bottom", () => ({
	StickToBottom: MockStickToBottom,
	useStickToBottomContext: () => ({
		contentRef: { current: contentElement },
		isAtBottom: currentIsAtBottom,
		scrollRef: { current: scrollElement },
		scrollToBottom: () => {},
	}),
}));

const { Conversation, ConversationContent } = await import("./conversation");

globalThis.ResizeObserver = MockResizeObserver;

type RenderConversationProps =
	| {
			preserveScrollOnTransientReset?: false;
			scrollRestoreKey?: never;
	  }
	| {
			preserveScrollOnTransientReset: true;
			scrollRestoreKey: string | number;
	  };

function resetHookState() {
	currentHookIndex = 0;
}

function resetHarnessState() {
	resetHookState();
	hookRefState = [];
	for (const effect of effectState) {
		effect?.cleanup?.();
	}
	effectState = [];
	currentScrollListener = null;
	currentResizeObserverCallback = null;
	currentIsAtBottom = false;
	observeCalls.length = 0;
	scrollElement.clientHeight = 200;
	scrollElement.scrollHeight = 400;
	scrollElement.scrollTop = 0;
}

function renderConversation(
	props?: RenderConversationProps,
	options?: { isAtBottom?: boolean },
) {
	observeCalls.length = 0;
	resetHookState();
	currentIsAtBottom = options?.isAtBottom ?? false;
	const content = (
		<ConversationContent>
			<div>conversation body</div>
		</ConversationContent>
	);
	renderToStaticMarkup(
		props ? (
			<Conversation {...props}>{content}</Conversation>
		) : (
			<Conversation>{content}</Conversation>
		),
	);
}

afterEach(() => {
	resetHarnessState();
});

describe("Conversation", () => {
	it("does not observe when the scroll guard is off by default", () => {
		renderConversation();

		expect(observeCalls).toHaveLength(0);
	});

	it("observes when transient reset preservation is opted in with a key", () => {
		renderConversation({
			preserveScrollOnTransientReset: true,
			scrollRestoreKey: "session-1",
		});

		expect(observeCalls).toHaveLength(1);
		expect(observeCalls[0]).toBe(contentElement);
	});

	it("does not observe when JS callers bypass the contract and pass a null key", () => {
		renderConversation({
			preserveScrollOnTransientReset: true,
			scrollRestoreKey: null,
		} as unknown as RenderConversationProps);

		expect(observeCalls).toHaveLength(0);
	});

	it("restores the saved scrollTop after a transient resize reset when the user is scrolled up", () => {
		renderConversation({
			preserveScrollOnTransientReset: true,
			scrollRestoreKey: "session-1",
		});

		scrollElement.scrollTop = 120;
		currentScrollListener?.();
		scrollElement.scrollTop = 0;
		currentResizeObserverCallback?.([], {} as ResizeObserver);

		expect(scrollElement.scrollTop).toBe(120);
	});

	it("clears previously saved scroll state when the scroll restore key changes", () => {
		renderConversation({
			preserveScrollOnTransientReset: true,
			scrollRestoreKey: "session-1",
		});

		scrollElement.scrollTop = 140;
		currentScrollListener?.();

		renderConversation({
			preserveScrollOnTransientReset: true,
			scrollRestoreKey: "session-2",
		});

		scrollElement.scrollTop = 0;
		currentResizeObserverCallback?.([], {} as ResizeObserver);

		expect(scrollElement.scrollTop).toBe(0);
	});

	it("clears saved scroll state when the user returns to the bottom", () => {
		renderConversation({
			preserveScrollOnTransientReset: true,
			scrollRestoreKey: "session-1",
		});

		scrollElement.scrollTop = 150;
		currentScrollListener?.();

		renderConversation(
			{
				preserveScrollOnTransientReset: true,
				scrollRestoreKey: "session-1",
			},
			{
				isAtBottom: true,
			},
		);

		scrollElement.scrollTop = 220;
		currentScrollListener?.();
		scrollElement.scrollTop = 0;
		currentResizeObserverCallback?.([], {} as ResizeObserver);

		expect(scrollElement.scrollTop).toBe(0);
	});
});
