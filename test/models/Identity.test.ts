import { test } from "node:test";
import assert from "node:assert";

import { Identity } from "../../src/models/Identity";
import { EmailAddress } from "../../src/models/EmailAddress";
import { JmapProtocolError } from "../../src/models/CommonTypes";

test("Identity serialization round‑trip with all fields", () => {
    const identity = new Identity({
        id: "id123",
        name: "John Doe",
        email: "john@example.com",
        replyTo: [
            new EmailAddress({ name: "Reply One", email: "reply1@example.com" }),
            new EmailAddress({ name: null, email: "reply2@example.com" }),
        ],
        bcc: [
            new EmailAddress({ name: "Bcc One", email: "bcc1@example.com" }),
        ],
        textSignature: "Best regards",
        htmlSignature: "<p>Best regards</p>",
        mayDelete: true,
    });

    const json = identity.toJson();

    const expectedJson: Record<string, unknown> = {
        id: "id123",
        name: "John Doe",
        email: "john@example.com",
        replyTo: [
            { name: "Reply One", email: "reply1@example.com" },
            { name: null, email: "reply2@example.com" },
        ],
        bcc: [{ name: "Bcc One", email: "bcc1@example.com" }],
        textSignature: "Best regards",
        htmlSignature: "<p>Best regards</p>",
        mayDelete: true,
    };
    assert.deepStrictEqual(json, expectedJson, "toJson output mismatch");

    const parsed = Identity.fromJson(json);
    assert.deepStrictEqual(parsed, identity, "fromJson did not produce an equivalent Identity");
});

test("Identity deserialization with missing optional fields defaults", () => {
    const raw = {
        email: "alice@example.com",
    };

    const identity = Identity.fromJson(raw);
    assert.strictEqual(identity.id, undefined);
    assert.strictEqual(identity.name, "");
    assert.strictEqual(identity.email, "alice@example.com");
    assert.strictEqual(identity.replyTo, null);
    assert.strictEqual(identity.bcc, null);
    assert.strictEqual(identity.textSignature, "");
    assert.strictEqual(identity.htmlSignature, "");
    assert.strictEqual(identity.mayDelete, undefined);
});

test("Identity.fromJson throws JmapProtocolError on invalid email type", () => {
    const raw = {
        email: 12345,
    };

    assert.throws(
        () => Identity.fromJson(raw),
        (err: any) => {
            if (err instanceof JmapProtocolError) {
                assert.strictEqual(err.type, "InvalidIdentity");
                assert.ok(
                    err.description !== null && /email is required/.test(err.description),
                    "Error description should mention email requirement",
                );
                return true;
            }
            return false;
        },
        "Expected JmapProtocolError for invalid email type",
    );
});
