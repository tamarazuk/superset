"use client";

import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useRef } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Loader } from "./loader";

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export function Conversation({
	className,
	children,
	...props
}: ConversationProps) {
	return (
		<StickToBottom
			className={cn("relative flex-1 overflow-y-hidden", className)}
			initial="instant"
			resize="instant"
			role="log"
			{...props}
		>
			{(context) => (
				<>
					<ScrollPositionGuard />
					{typeof children === "function" ? children(context) : children}
				</>
			)}
		</StickToBottom>
	);
}

export type ConversationContentProps = ComponentProps<
	typeof StickToBottom.Content
>;

/** Restores scroll position when transient content changes reset scrollTop to 0. */
function ScrollPositionGuard() {
	const { scrollRef, isAtBottom } = useStickToBottomContext();
	const savedScrollTopRef = useRef<number | null>(null);
	const isAtBottomRef = useRef(isAtBottom);
	isAtBottomRef.current = isAtBottom;

	useEffect(() => {
		const scrollElement = scrollRef.current;
		if (!scrollElement) return;

		const handleScroll = () => {
			if (!isAtBottomRef.current) {
				savedScrollTopRef.current = scrollElement.scrollTop;
			}
			if (isAtBottomRef.current) {
				savedScrollTopRef.current = null;
			}
		};

		scrollElement.addEventListener("scroll", handleScroll, { passive: true });
		return () => scrollElement.removeEventListener("scroll", handleScroll);
	}, [scrollRef]);

	useEffect(() => {
		const scrollElement = scrollRef.current;
		if (!scrollElement) return;

		const contentElement = scrollElement.firstElementChild;
		if (!contentElement) return;

		const observer = new ResizeObserver(() => {
			if (
				savedScrollTopRef.current !== null &&
				savedScrollTopRef.current > 0 &&
				scrollElement.scrollTop === 0 &&
				scrollElement.scrollHeight > scrollElement.clientHeight
			) {
				const restoreTo = Math.min(
					savedScrollTopRef.current,
					scrollElement.scrollHeight - scrollElement.clientHeight,
				);
				scrollElement.scrollTop = restoreTo;
			}
		});

		observer.observe(contentElement);
		return () => observer.disconnect();
	}, [scrollRef]);

	return null;
}

export const ConversationContent = ({
	className,
	...props
}: ConversationContentProps) => (
	<StickToBottom.Content
		className={cn("flex flex-col gap-8 p-4 select-text", className)}
		{...props}
	/>
);

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
	title?: string;
	description?: string;
	icon?: React.ReactNode;
};

type ConversationStateContainerProps = ComponentProps<"div">;

const ConversationStateContainer = ({
	className,
	children,
	...props
}: ConversationStateContainerProps) => (
	<div
		className={cn(
			"flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
			className,
		)}
		{...props}
	>
		{children}
	</div>
);

export const ConversationEmptyState = ({
	className,
	title = "No messages yet",
	description = "Start a conversation to see messages here",
	icon,
	children,
	...props
}: ConversationEmptyStateProps) => (
	<ConversationStateContainer className={className} {...props}>
		{children ?? (
			<>
				{icon && <div className="text-muted-foreground">{icon}</div>}
				<div className="space-y-1">
					<h3 className="font-medium text-sm">{title}</h3>
					{description && (
						<p className="text-muted-foreground text-sm">{description}</p>
					)}
				</div>
			</>
		)}
	</ConversationStateContainer>
);

export type ConversationLoadingStateProps = ComponentProps<"div"> & {
	label?: string;
	icon?: React.ReactNode;
};

export const ConversationLoadingState = ({
	className,
	label = "Loading conversation...",
	icon,
	children,
	...props
}: ConversationLoadingStateProps) => (
	<ConversationStateContainer className={className} {...props}>
		{children ?? (
			<>
				{icon ?? <Loader className="text-muted-foreground" size={14} />}
				<p className="text-muted-foreground text-sm">{label}</p>
			</>
		)}
	</ConversationStateContainer>
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
	className,
	...props
}: ConversationScrollButtonProps) => {
	const { isAtBottom, scrollToBottom } = useStickToBottomContext();

	const handleScrollToBottom = useCallback(() => {
		scrollToBottom();
	}, [scrollToBottom]);

	return (
		!isAtBottom && (
			<Button
				className={cn(
					"absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full",
					className,
				)}
				onClick={handleScrollToBottom}
				size="icon"
				type="button"
				variant="outline"
				{...props}
			>
				<ArrowDownIcon className="size-4" />
			</Button>
		)
	);
};

export const useConversationContext = useStickToBottomContext;
