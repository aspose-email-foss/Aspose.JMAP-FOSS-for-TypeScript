/**
 * Unit tests for the {@link Invocation} model.
 *
 * These tests verify correct (de)serialization and error handling. Per RFC 8620
 * section 3.2, the wire format is a 3-element JSON array [name, arguments,
 * methodCallId], never an object with named keys.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { Invocation } from "../../src/models/Invocation";
import { JmapProtocolError } from "../../src/models/CommonTypes";

/* Normal case: successful deserialization */
test("Invocation.fromJson creates an instance with correct properties", () => {
  const json = ["Mail/get", { accountId: "user-123", ids: ["m1", "m2"] }, "c1"];

  const inv = Invocation.fromJson(json);
  assert.strictEqual(inv.name, json[0]);
  assert.deepStrictEqual(inv.arguments, json[1]);
  assert.strictEqual(inv.methodCallId, json[2]);
});

/* Normal case: serialization matches original input */
test("Invocation.toJson returns a JSON representation matching the original input", () => {
  const original = ["Email/query", { accountId: "acc-456", filter: { text: "hello" } }, "q1"];

  const inv = Invocation.fromJson(original);
  const serialized = inv.toJson();

  assert.deepStrictEqual(serialized, original);
});

/* Edge case: not a 3-element array */
test("Invocation.fromJson throws JmapProtocolError when input is not a 3-element array", () => {
  const missingName = [{ accountId: "a" }, "id1"];

  assert.throws(
    () => Invocation.fromJson(missingName as unknown),
    (err) => {
      assert(err instanceof JmapProtocolError);
      // The error type is defined by the model as "invalidInvocation"
      assert.strictEqual((err as JmapProtocolError).type, "invalidInvocation");
      return true;
    },
    "Expected JmapProtocolError for a malformed array"
  );
});

/* Edge case: fields have incorrect types */
test("Invocation.fromJson throws JmapProtocolError when fields have wrong types", () => {
  const wrongTypes = [123, "not-an-object", null];

  assert.throws(
    () => Invocation.fromJson(wrongTypes as unknown),
    (err) => {
      assert(err instanceof JmapProtocolError);
      return true;
    },
    "Expected JmapProtocolError for invalid field types"
  );
});
