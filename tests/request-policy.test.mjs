import assert from "node:assert/strict";
import test from "node:test";
import { canSubmitDraft, editDraft, toolsAvailableToAI } from "../dist-test/request-policy.js";

test("AI cannot access a submission tool", () => {
  assert.deepEqual(toolsAvailableToAI(), ["search_knowledge", "check_availability", "create_request_draft"]);
  assert.ok(!toolsAvailableToAI().includes("submit_request"));
});

test("draft requires explicit confirmation of the current version", () => {
  const draft = { id: "1", ownerId: "user-a", status: "draft", version: 2, confirmedVersion: 2 };
  assert.equal(canSubmitDraft(draft, "user-a"), true);
  assert.equal(canSubmitDraft(draft, "user-b"), false);
});

test("editing invalidates previous confirmation", () => {
  const edited = editDraft({ id: "1", ownerId: "user-a", status: "draft", version: 2, confirmedVersion: 2 });
  assert.equal(edited.version, 3);
  assert.equal(edited.confirmedVersion, undefined);
  assert.equal(canSubmitDraft(edited, "user-a"), false);
});
