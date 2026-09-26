/**
 * Unit tests for the {@link DeliveryStatus} model.
 *
 * These tests verify correct (de)serialization and error handling.
 * Imports use relative paths to the source files, as the public package entry point
 * is not available during compilation of the test suite.
 */

import test from "node:test";
import assert from "node:assert";

import { DeliveryStatus } from "../../src/models/DeliveryStatus";
import { JmapProtocolError } from "../../src/models/CommonTypes";

test("DeliveryStatus serialization round‑trip", () => {
    const original = new DeliveryStatus({
        smtpReply: "250 OK",
        delivered: "yes",
        displayed: "yes",
    });

    const json = original.toJson();
    assert.deepStrictEqual(json, {
        smtpReply: "250 OK",
        delivered: "yes",
        displayed: "yes",
    });

    const parsed = DeliveryStatus.fromJson(json);
    assert.strictEqual(parsed.smtpReply, original.smtpReply);
    assert.strictEqual(parsed.delivered, original.delivered);
    assert.strictEqual(parsed.displayed, original.displayed);
});

test("DeliveryStatus.fromJson throws when a required property is missing", () => {
    const incomplete = {
        // smtpReply omitted intentionally
        delivered: "no",
        displayed: "unknown",
    } as unknown;

    assert.throws(
        () => DeliveryStatus.fromJson(incomplete),
        (err: unknown) => {
            assert(err instanceof JmapProtocolError);
            assert.match((err as Error).message, /smtpReply must be a string/);
            return true;
        },
        "Expected JmapProtocolError for missing smtpReply"
    );
});

test("DeliveryStatus.fromJson throws when a property has the wrong type", () => {
    const malformed = {
        smtpReply: 123, // should be a string
        delivered: "queued",
        displayed: "yes",
    } as unknown;

    assert.throws(
        () => DeliveryStatus.fromJson(malformed),
        (err: unknown) => {
            assert(err instanceof JmapProtocolError);
            assert.match((err as Error).message, /smtpReply must be a string/);
            return true;
        },
        "Expected JmapProtocolError for non‑string smtpReply"
    );
});
