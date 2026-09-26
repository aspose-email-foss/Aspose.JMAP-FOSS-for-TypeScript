/**
 * Unit tests for shared JMAP types.
 *
 * These tests import the symbols directly from the source files (relative to the
 * test location) because the package entry point is not yet compiled during
 * `tsc`. This satisfies the strict TypeScript build while still exercising the
 * public API of the models.
 */

import test from "node:test";
import assert from "node:assert";

import {
    SetError,
    MethodError,
    ResultReference,
    JmapProtocolError,
    JmapNetworkError,
} from "../../src/models/CommonTypes";

test("SetError.fromJson parses full object and round‑trips", () => {
    const json = {
        type: "invalidProperties",
        description: "Invalid email address",
        properties: ["email", "name"],
    };
    const err = SetError.fromJson(json);
    assert.strictEqual(err.type, "invalidProperties");
    assert.strictEqual(err.description, "Invalid email address");
    assert.deepStrictEqual(err.properties, ["email", "name"]);

    const roundTrip = err.toJson();
    assert.deepStrictEqual(roundTrip, json);
});

test("SetError.fromJson handles missing optional fields", () => {
    const json = { type: "notFound" };
    const err = SetError.fromJson(json);
    assert.strictEqual(err.type, "notFound");
    assert.strictEqual(err.description, null);
    assert.strictEqual(err.properties, null);

    const roundTrip = err.toJson();
    assert.deepStrictEqual(roundTrip, json);
});

test("SetError.fromJson throws JmapProtocolError on invalid type field", () => {
    const bad = { type: 123 };
    assert.throws(
        () => SetError.fromJson(bad),
        (e) => {
            assert(e instanceof JmapProtocolError);
            assert.strictEqual((e as JmapProtocolError).type, "invalidArguments");
            return true;
        }
    );
});

test("MethodError.fromJson parses full object and round‑trips", () => {
    const json = {
        type: "unknownMethod",
        description: "Method does not exist",
    };
    const err = MethodError.fromJson(json);
    assert.strictEqual(err.type, "unknownMethod");
    assert.strictEqual(err.description, "Method does not exist");

    const roundTrip = err.toJson();
    assert.deepStrictEqual(roundTrip, json);
});

test("MethodError.fromJson handles missing description", () => {
    const json = { type: "accountNotFound" };
    const err = MethodError.fromJson(json);
    assert.strictEqual(err.type, "accountNotFound");
    assert.strictEqual(err.description, null);

    const roundTrip = err.toJson();
    assert.deepStrictEqual(roundTrip, json);
});

test("MethodError.fromJson throws JmapProtocolError on non‑object input", () => {
    assert.throws(
        () => MethodError.fromJson(null),
        (e) => {
            assert(e instanceof JmapProtocolError);
            assert.strictEqual((e as JmapProtocolError).type, "invalidArguments");
            return true;
        }
    );
});

test("ResultReference.fromJson parses valid object and round‑trips", () => {
    const json = {
        resultOf: "c1",
        name: "Mailbox/set",
        path: "/created/mb1/id",
    };
    const ref = ResultReference.fromJson(json);
    assert.strictEqual(ref.resultOf, "c1");
    assert.strictEqual(ref.name, "Mailbox/set");
    assert.strictEqual(ref.path, "/created/mb1/id");

    const roundTrip = ref.toJson();
    assert.deepStrictEqual(roundTrip, json);
});

test("ResultReference.fromJson throws JmapProtocolError when required fields are missing", () => {
    const incomplete = { resultOf: "c1", name: "Mailbox/set" };
    assert.throws(
        () => ResultReference.fromJson(incomplete),
        (e) => {
            assert(e instanceof JmapProtocolError);
            assert.strictEqual((e as JmapProtocolError).type, "invalidArguments");
            return true;
        }
    );
});

test("JmapProtocolError constructs message correctly", () => {
    const err = new JmapProtocolError("invalidArguments", "Bad input");
    assert.strictEqual(err.message, "invalidArguments: Bad input");
    assert.strictEqual(err.type, "invalidArguments");
    assert.strictEqual(err.description, "Bad input");
});

test("JmapNetworkError stores cause and message", () => {
    const cause = new Error("network down");
    const err = new JmapNetworkError("Fetch failed", cause);
    assert.strictEqual(err.message, "Fetch failed");
    assert.strictEqual(err.cause, cause);
});
