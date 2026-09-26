import { describe, it } from "node:test";
import assert from "node:assert";

import { Thread } from "../../src/models/Thread";
import { JmapProtocolError } from "../../src/models/CommonTypes";

describe("Thread model", () => {
    it("deserialises a full payload and round‑trips via toJson()", () => {
        const json = {
            id: "thread-123",
            emailIds: ["email-1", "email-2", "email-3"],
        };

        const thread = Thread.fromJson(json);
        assert.ok(thread instanceof Thread);
        assert.strictEqual(thread.id, "thread-123");
        assert.deepStrictEqual(thread.emailIds, ["email-1", "email-2", "email-3"]);

        const roundTrip = thread.toJson();
        assert.deepStrictEqual(roundTrip, json);
    });

    it("handles a payload without the optional id field", () => {
        const json = {
            emailIds: ["email-A", "email-B"],
        };

        const thread = Thread.fromJson(json);
        assert.ok(thread instanceof Thread);
        assert.strictEqual(thread.id, undefined);
        assert.deepStrictEqual(thread.emailIds, ["email-A", "email-B"]);

        const roundTrip = thread.toJson();
        assert.deepStrictEqual(roundTrip, { emailIds: ["email-A", "email-B"] });
    });

    it("rejects when emailIds is not an array", () => {
        const bad = {
            id: "bad",
            emailIds: "not-an-array",
        };

        assert.throws(() => Thread.fromJson(bad), (e: unknown) => e instanceof JmapProtocolError);
    });

    it("rejects when emailIds contains non‑string members", () => {
        const bad = {
            emailIds: ["valid", 123 as unknown],
        };

        assert.throws(() => Thread.fromJson(bad), (e: unknown) => e instanceof JmapProtocolError);
    });

    it("rejects when id is present but not a string", () => {
        const bad = {
            id: 999 as unknown,
            emailIds: ["email-1"],
        };

        assert.throws(() => Thread.fromJson(bad), (e: unknown) => e instanceof JmapProtocolError);
    });
});
