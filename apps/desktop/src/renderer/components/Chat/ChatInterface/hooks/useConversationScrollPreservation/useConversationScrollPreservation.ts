import { useRef } from "react";

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

	if (prevSessionIdRef.current !== sessionId) {
		prevSessionIdRef.current = sessionId;
		hasEverHadContentRef.current = false;
	}

	if (hasConversationContent) {
		hasEverHadContentRef.current = true;
	}

	const shouldShowConversationLoading =
		isConversationLoading &&
		!isAwaitingAssistant &&
		!hasConversationContent &&
		!hasEverHadContentRef.current;
	const shouldShowEmptyState =
		!shouldShowConversationLoading &&
		!hasConversationContent &&
		!hasEverHadContentRef.current;
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
