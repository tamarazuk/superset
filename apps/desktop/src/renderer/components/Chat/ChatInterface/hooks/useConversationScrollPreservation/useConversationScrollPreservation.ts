import { useLayoutEffect, useRef } from "react";

type UseConversationScrollPreservationParams = {
	hasConversationContent: boolean;
	isAwaitingAssistant: boolean;
	isConversationLoading: boolean;
	sessionId?: string | null;
};

export function useConversationScrollPreservation({
	hasConversationContent,
	isAwaitingAssistant,
	isConversationLoading,
	sessionId,
}: UseConversationScrollPreservationParams) {
	const hasEverHadContentRef = useRef(false);
	const prevSessionIdRef = useRef(sessionId);
	const sessionChanged = prevSessionIdRef.current !== sessionId;
	const hasEverHadContent =
		!sessionChanged && (hasEverHadContentRef.current || hasConversationContent);

	useLayoutEffect(() => {
		prevSessionIdRef.current = sessionId;
		hasEverHadContentRef.current = hasEverHadContent;
	}, [hasEverHadContent, sessionId]);

	const shouldShowConversationLoading =
		isConversationLoading &&
		!isAwaitingAssistant &&
		!hasConversationContent &&
		!hasEverHadContent;
	const shouldShowEmptyState =
		!shouldShowConversationLoading &&
		!hasConversationContent &&
		!hasEverHadContent;
	const scrollPreservationProps = sessionId
		? ({
				preserveScrollOnTransientReset: true,
				scrollRestoreKey: sessionId,
			} as const)
		: {};

	return {
		scrollPreservationProps,
		shouldShowConversationLoading,
		shouldShowEmptyState,
	};
}
