import { afterEach, describe, expect, it, mock } from "bun:test";
import type { RefObject } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const actualReact: typeof import("react") = await import("react");
const { forwardRef } = actualReact;

let currentHookIndex = 0;
let hookRefState: unknown[] = [];

const mockUseMemo = (<T,>(factory: () => T) =>
	factory()) as typeof actualReact.useMemo;
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

mock.module("react", () => ({
	...actualReact,
	useMemo: mockUseMemo,
	useRef: mockUseRef,
}));

mock.module("@superset/ui/ai-elements/conversation", () => ({
	Conversation: ({
		children,
		preserveScrollOnTransientReset,
		scrollRestoreKey,
	}: {
		children: React.ReactNode;
		preserveScrollOnTransientReset?: boolean;
		scrollRestoreKey?: string | null;
	}) => (
		<div
			data-preserve-scroll-on-reset={String(
				preserveScrollOnTransientReset ?? false,
			)}
			data-scroll-restore-key={scrollRestoreKey ?? ""}
		>
			{children}
		</div>
	),
	ConversationContent: forwardRef<
		HTMLDivElement,
		{ children: React.ReactNode }
	>(({ children }, ref) => <div ref={ref}>{children}</div>),
	ConversationLoadingState: ({ label }: { label?: string }) => (
		<div>{label ?? "Loading conversation..."}</div>
	),
	ConversationEmptyState: ({ title }: { title?: string }) => (
		<div>{title ?? "Empty"}</div>
	),
	ConversationScrollButton: () => null,
}));

mock.module("@superset/ui/ai-elements/message", () => ({
	Message: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	MessageContent: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

mock.module("@superset/ui/ai-elements/shimmer-label", () => ({
	ShimmerLabel: ({ children }: { children: React.ReactNode }) => (
		<span>{children}</span>
	),
}));

mock.module(
	"renderer/components/Chat/ChatInterface/components/ToolCallBlock",
	() => ({
		ToolCallBlock: () => null,
	}),
);

mock.module("./components/AssistantMessage", () => ({
	AssistantMessage: ({
		message,
		footer,
	}: {
		message: {
			id: string;
			content: Array<{ type: string; text?: string }>;
		};
		footer?: React.ReactNode;
	}) => (
		<div data-assistant-id={message.id}>
			{message.content
				.filter((part) => part.type === "text")
				.map((part, index) => (
					<span key={`${message.id}-${index}`}>{part.text}</span>
				))}
			{footer}
		</div>
	),
}));

mock.module("./components/UserMessage", () => ({
	UserMessage: ({
		message,
	}: {
		message: {
			id: string;
			content: Array<{ type: string; text?: string }>;
		};
	}) => (
		<div data-user-id={message.id}>
			{message.content
				.filter((part) => part.type === "text")
				.map((part, index) => (
					<span key={`${message.id}-${index}`}>{part.text}</span>
				))}
		</div>
	),
}));

mock.module("./components/MessageScrollbackRail", () => ({
	MessageScrollbackRail: ({
		messages,
	}: {
		messages: Array<{ id: string }>;
	}) => <div data-rail-count={messages.length} />,
}));

mock.module("./components/SubagentExecutionMessage", () => ({
	SubagentExecutionMessage: () => <div>SUBAGENT_EXECUTION_MESSAGE</div>,
}));

mock.module("./components/PendingApprovalMessage", () => ({
	PendingApprovalMessage: () => null,
}));

mock.module("./components/PendingPlanApprovalMessage", () => ({
	PendingPlanApprovalMessage: () => <div>PENDING_PLAN_APPROVAL_MESSAGE</div>,
}));

mock.module("./components/PendingQuestionMessage", () => ({
	PendingQuestionMessage: () => null,
}));

mock.module("./components/ToolPreviewMessage", () => ({
	ToolPreviewMessage: ({
		pendingPlanToolCallId,
	}: {
		pendingPlanToolCallId?: string | null;
	}) => (
		<div data-pending-plan-tool-call-id={pendingPlanToolCallId ?? ""}>
			TOOL_PREVIEW_MESSAGE
		</div>
	),
}));

mock.module("./hooks/useChatMessageSearch", () => ({
	useChatMessageSearch: () => ({
		isSearchOpen: false,
		query: "",
		caseSensitive: false,
		matchCount: 0,
		activeMatchIndex: 0,
		setQuery: () => {},
		setCaseSensitive: () => {},
		findNext: () => {},
		findPrevious: () => {},
		closeSearch: () => {},
	}),
}));

const { ChatMessageList } = await import("./ChatMessageList");
type ChatMessageListProps = Parameters<typeof ChatMessageList>[0];

type TestMessage = {
	id: string;
	role: "user" | "assistant";
	content: Array<{ type: "text"; text: string }>;
	createdAt: Date;
};

function testMessage(
	id: string,
	role: TestMessage["role"],
	text: string,
	createdAt: string,
): TestMessage {
	return {
		id,
		role,
		content: [{ type: "text", text }],
		createdAt: new Date(createdAt),
	};
}

function createBaseProps(
	overrides: Partial<ChatMessageListProps> = {},
): ChatMessageListProps {
	return {
		messages: [] as never,
		isFocused: true,
		isRunning: false,
		isConversationLoading: false,
		isAwaitingAssistant: false,
		currentMessage: null,
		interruptedMessage: null,
		workspaceId: "workspace-1",
		sessionId: "session-1",
		organizationId: "org-1",
		workspaceCwd: "/repo",
		activeTools: undefined,
		toolInputBuffers: undefined,
		activeSubagents: undefined,
		pendingApproval: null,
		isApprovalSubmitting: false,
		onApprovalRespond: async () => {},
		pendingPlanApproval: null,
		isPlanSubmitting: false,
		onPlanRespond: async () => {},
		pendingQuestion: null,
		isQuestionSubmitting: false,
		onQuestionRespond: async () => {},
		editingUserMessageId: null,
		isEditSubmitting: false,
		onStartEditUserMessage: () => {},
		onCancelEditUserMessage: () => {},
		onSubmitEditedUserMessage: async () => {},
		onRestartUserMessage: async () => {},
		...overrides,
	};
}

function resetHookState() {
	currentHookIndex = 0;
}

function createRenderHarness(
	initialOverrides: Partial<ChatMessageListProps> = {},
) {
	let currentProps = createBaseProps(initialOverrides);

	return {
		render(overrides: Partial<ChatMessageListProps> = {}) {
			currentProps = createBaseProps({
				...currentProps,
				...overrides,
			});
			resetHookState();
			return renderToStaticMarkup(ChatMessageList(currentProps));
		},
	};
}

function renderListHtml(overrides: Partial<ChatMessageListProps> = {}): string {
	return createRenderHarness().render(overrides);
}

afterEach(() => {
	currentHookIndex = 0;
	hookRefState = [];
});

describe("ChatMessageList", () => {
	it("opts into scroll reset preservation and passes the session identity", () => {
		const html = renderListHtml({
			sessionId: "session-42",
		});

		expect(html).toContain('data-preserve-scroll-on-reset="true"');
		expect(html).toContain('data-scroll-restore-key="session-42"');
	});

	it("shows loading state while conversation history is loading", () => {
		const html = renderListHtml({
			isConversationLoading: true,
		});

		expect(html).toContain("Loading conversation...");
		expect(html).not.toContain("Start a conversation");
	});

	it("shows empty state on initial render with no messages", () => {
		const html = renderListHtml({
			messages: [] as never,
		});

		expect(html).toContain("Start a conversation");
		expect(html).not.toContain("Loading conversation...");
	});

	it("keeps the conversation mounted through a transient reset in the same session", () => {
		const harness = createRenderHarness({
			messages: [
				testMessage(
					"user-1",
					"user",
					"hello world",
					"2026-03-30T00:00:00.000Z",
				),
			] as never,
		});

		harness.render();

		const html = harness.render({
			messages: [] as never,
			sessionId: "session-1",
		});

		expect(html).not.toContain("Start a conversation");
		expect(html).not.toContain("Loading conversation...");
	});

	it("shows empty state again after the session changes", () => {
		const harness = createRenderHarness({
			messages: [
				testMessage(
					"user-1",
					"user",
					"hello world",
					"2026-03-30T00:00:00.000Z",
				),
			] as never,
			sessionId: "session-1",
		});

		harness.render();

		const html = harness.render({
			messages: [] as never,
			sessionId: "session-2",
		});

		expect(html).toContain("Start a conversation");
		expect(html).not.toContain("Loading conversation...");
		expect(html).toContain('data-scroll-restore-key="session-2"');
	});

	it("renders messages instead of empty state when messages are provided", () => {
		const html = renderListHtml({
			messages: [
				testMessage(
					"user-1",
					"user",
					"hello world",
					"2026-03-30T00:00:00.000Z",
				),
			] as never,
		});

		expect(html).toContain("hello world");
		expect(html).not.toContain("Start a conversation");
		expect(html).not.toContain("Loading conversation...");
	});

	it("shows interrupted preview content after stop and hides the source assistant message", () => {
		const html = renderListHtml({
			messages: [
				testMessage(
					"user-1",
					"user",
					"first user prompt",
					"2026-03-03T00:00:00.000Z",
				),
				testMessage(
					"assistant-1",
					"assistant",
					"persisted assistant text",
					"2026-03-03T00:00:01.000Z",
				),
			] as never,
			interruptedMessage: {
				id: "interrupted:assistant-1",
				sourceMessageId: "assistant-1",
				content: [{ type: "text", text: "interrupted snapshot text" }],
			} as never,
		});

		expect(html).toContain("first user prompt");
		expect(html).toContain("interrupted snapshot text");
		expect(html).toContain("Interrupted");
		expect(html).toContain("Response stopped");
		expect(html).not.toContain("persisted assistant text");
	});

	it("does not show interrupted preview while a response is still running", () => {
		const html = renderListHtml({
			messages: [
				testMessage(
					"user-1",
					"user",
					"first user prompt",
					"2026-03-03T00:00:00.000Z",
				),
				testMessage(
					"assistant-1",
					"assistant",
					"persisted assistant text",
					"2026-03-03T00:00:01.000Z",
				),
			] as never,
			isRunning: true,
			isAwaitingAssistant: true,
			currentMessage: testMessage(
				"assistant-current",
				"assistant",
				"streaming assistant text",
				"2026-03-03T00:00:02.000Z",
			) as never,
			interruptedMessage: {
				id: "interrupted:assistant-1",
				sourceMessageId: "assistant-1",
				content: [{ type: "text", text: "interrupted snapshot text" }],
			} as never,
		});

		expect(html).toContain("streaming assistant text");
		expect(html).not.toContain("interrupted snapshot text");
		expect(html).not.toContain("Interrupted");
		expect(html).not.toContain("Response stopped");
	});

	it("renders subagent activity while keeping anchored pending plan inline", () => {
		const html = renderListHtml({
			messages: [
				{
					id: "assistant-plan-1",
					role: "assistant",
					content: [
						{
							type: "tool_call",
							id: "tool-call-1",
							name: "submit_plan",
							args: {},
						},
					],
					createdAt: new Date("2026-03-03T00:00:01.000Z"),
				},
			] as never,
			activeSubagents: new Map([
				[
					"tool-call-1",
					{
						status: "running",
						task: "Run tests",
					},
				],
			]) as never,
			pendingPlanApproval: {
				planId: "tool-call-1",
				title: "Implementation plan",
				plan: "Do the thing",
			} as never,
		});

		expect(html).toContain("SUBAGENT_EXECUTION_MESSAGE");
		expect(html).not.toContain("PENDING_PLAN_APPROVAL_MESSAGE");
	});

	it("shows tool preview while awaiting assistant when pending plan is anchored", () => {
		const html = renderListHtml({
			isAwaitingAssistant: true,
			activeTools: new Map([
				[
					"tool-call-1",
					{
						name: "submit_plan",
						status: "streaming_input",
					},
				],
			]) as never,
			pendingPlanApproval: {
				toolCallId: "tool-call-1",
				title: "Implementation plan",
				plan: "Do the thing",
			} as never,
		});

		expect(html).toContain("TOOL_PREVIEW_MESSAGE");
		expect(html).not.toContain("PENDING_PLAN_APPROVAL_MESSAGE");
	});

	it("does not render standalone pending plan when anchored from interrupted preview", () => {
		const html = renderListHtml({
			messages: [
				{
					id: "assistant-1",
					role: "assistant",
					content: [
						{
							type: "tool_call",
							id: "tool-call-interrupted",
							name: "submit_plan",
							args: {},
						},
					],
					createdAt: new Date("2026-03-03T00:00:01.000Z"),
				},
			] as never,
			interruptedMessage: {
				id: "interrupted:assistant-1",
				sourceMessageId: "assistant-1",
				content: [
					{
						type: "tool_call",
						id: "tool-call-interrupted",
						name: "submit_plan",
						args: {},
					},
				],
			} as never,
			pendingPlanApproval: {
				title: "Implementation plan",
				plan: "Do the thing",
			} as never,
		});

		expect(html).not.toContain("PENDING_PLAN_APPROVAL_MESSAGE");
	});
});
