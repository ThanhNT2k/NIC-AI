export function canSubmitDraft(draft, actorId) {
    return draft.status === "draft" && draft.ownerId === actorId && draft.confirmedVersion === draft.version;
}
export function editDraft(draft) {
    if (draft.status !== "draft")
        throw new Error("Submitted requests cannot be edited");
    return { ...draft, version: draft.version + 1, confirmedVersion: undefined };
}
export function toolsAvailableToAI() {
    return ["search_knowledge", "check_availability", "create_request_draft"];
}
