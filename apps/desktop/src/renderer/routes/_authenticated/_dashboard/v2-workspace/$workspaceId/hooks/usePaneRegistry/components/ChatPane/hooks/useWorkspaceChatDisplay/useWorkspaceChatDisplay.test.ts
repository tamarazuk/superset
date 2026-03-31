import { describe, expect, it } from "bun:test";
import { createChatDisplayQueryOptions } from "./useWorkspaceChatDisplay";

describe("createChatDisplayQueryOptions", () => {
	it("retains workspace chat query data between polls", () => {
		const options = createChatDisplayQueryOptions({
			isQueryEnabled: true,
			hasQueryInput: true,
			refetchIntervalMs: 16,
		});

		expect(options.enabled).toBe(true);
		expect(options.refetchInterval).toBe(16);
		expect(options.gcTime).toBe(30_000);
	});
});
