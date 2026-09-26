import { test } from "node:test";
import assert from "node:assert";
import { SearchSnippet } from "../../src/models/SearchSnippet";

/**
 * Verify that a full JSON object round‑trips through fromJson / toJson.
 */
test("SearchSnippet.fromJson creates instance with all fields", () => {
    const json = {
        emailId: "mail-123",
        subject: "Hello <mark>World</mark>",
        preview: "This is a <mark>preview</mark> snippet.",
    };

    const snippet = SearchSnippet.fromJson(json);
    assert.strictEqual(snippet.emailId, "mail-123");
    assert.strictEqual(snippet.subject, "Hello <mark>World</mark>");
    assert.strictEqual(snippet.preview, "This is a <mark>preview</mark> snippet.");

    const roundTrip = snippet.toJson();
    assert.deepStrictEqual(roundTrip, json);
});

/**
 * Verify that missing nullable properties are treated as null.
 */
test("SearchSnippet.fromJson treats missing nullable fields as null", () => {
    const json = {
        emailId: "mail-456",
    };

    const snippet = SearchSnippet.fromJson(json);
    assert.strictEqual(snippet.emailId, "mail-456");
    assert.strictEqual(snippet.subject, null);
    assert.strictEqual(snippet.preview, null);

    const expected = {
        emailId: "mail-456",
        subject: null,
        preview: null,
    };
    assert.deepStrictEqual(snippet.toJson(), expected);
});

/**
 * Verify that an invalid emailId type causes a TypeError.
 */
test("SearchSnippet.fromJson throws TypeError for invalid emailId type", () => {
    const badJson = {
        emailId: 12345,
        subject: "Subject",
        preview: "Preview",
    };

    assert.throws(
        () => SearchSnippet.fromJson(badJson),
        (err: unknown) =>
            err instanceof TypeError && /emailId/.test((err as Error).message)
    );
});
