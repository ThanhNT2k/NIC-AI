export type RequestDraft = {
  id: string;
  ownerId: string;
  status: "draft" | "submitted";
  version: number;
  confirmedVersion?: number;
};

export function canSubmitDraft(draft: RequestDraft, actorId: string) {
  return draft.status === "draft" && draft.ownerId === actorId && draft.confirmedVersion === draft.version;
}

export function editDraft(draft: RequestDraft): RequestDraft {
  if (draft.status !== "draft") throw new Error("Submitted requests cannot be edited");
  return { ...draft, version: draft.version + 1, confirmedVersion: undefined };
}

export function toolsAvailableToAI() {
  return ["search_knowledge", "check_availability", "create_request_draft"] as const;
}
