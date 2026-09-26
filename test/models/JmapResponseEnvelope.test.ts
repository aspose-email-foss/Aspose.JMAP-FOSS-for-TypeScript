/**
 * Unit tests for {@link JmapResponseEnvelope}.
 *
 * These tests verify the (de)serialization logic and error handling of the envelope model.
 * All symbols are imported from the public package entry point as required by the style guide.
 */
import { test } from "node:test";
import assert from "node:assert";

import { JmapResponseEnvelope } from "../../src/models/JmapResponseEnvelope";
import { Invocation } from "../../src/models/Invocation";
import { JmapProtocolError } from "../../src/models/CommonTypes";

test("JmapResponseEnvelope normal serialization/deserialization", () => {
  const invocation = new Invocation({
    name: "Mail/get",
    arguments: { accountId: "acc1", ids: ["m1"] },
    methodCallId: "c1",
  });

  const envelope = new JmapResponseEnvelope({
    methodResponses: [invocation],
    createdIds: { clientId1: "serverId1" },
    sessionState: "state123",
  });

  const json = envelope.toJson();

  // Verify JSON shape
  assert.deepStrictEqual(json, {
    methodResponses: [
      ["Mail/get", { accountId: "acc1", ids: ["m1"] }, "c1"],
    ],
    createdIds: { clientId1: "serverId1" },
    sessionState: "state123",
  });

  // Round‑trip via fromJson
  const parsed = JmapResponseEnvelope.fromJson(json);
  assert.strictEqual(parsed.sessionState, "state123");
  assert.deepStrictEqual(parsed.createdIds, { clientId1: "serverId1" });
  assert.strictEqual(parsed.methodResponses.length, 1);
  const parsedInv = parsed.methodResponses[0];
  assert.strictEqual(parsedInv.name, "Mail/get");
  assert.deepStrictEqual(parsedInv.arguments, { accountId: "acc1", ids: ["m1"] });
  assert.strictEqual(parsedInv.methodCallId, "c1");
});

test("JmapResponseEnvelope handles createdIds set to null", () => {
  const invocation = new Invocation({
    name: "Identity/get",
    arguments: { accountId: "acc2" },
    methodCallId: "c2",
  });

  const envelope = new JmapResponseEnvelope({
    methodResponses: [invocation],
    createdIds: null,
    sessionState: "state456",
  });

  const json = envelope.toJson();

  // createdIds should be null in the output
  assert.deepStrictEqual(json, {
    methodResponses: [
      ["Identity/get", { accountId: "acc2" }, "c2"],
    ],
    createdIds: null,
    sessionState: "state456",
  });

  const parsed = JmapResponseEnvelope.fromJson(json);
  assert.strictEqual(parsed.createdIds, null);
  assert.strictEqual(parsed.sessionState, "state456");
});

test("JmapResponseEnvelope.fromJson throws on invalid methodResponses type", () => {
  const badJson = {
    methodResponses: "not-an-array",
    createdIds: null,
    sessionState: "state789",
  } as unknown;

  assert.throws(
    () => JmapResponseEnvelope.fromJson(badJson),
    (err) => {
      assert(err instanceof JmapProtocolError);
      assert.match((err as Error).message, /methodResponses/);
      return true;
    },
    "Expected JmapProtocolError for invalid methodResponses"
  );
});

test("JmapResponseEnvelope.fromJson throws on non‑string createdIds entry", () => {
  const badJson = {
    methodResponses: [
      ["Mail/get", { accountId: "acc3" }, "c3"],
    ],
    createdIds: { clientId: 123 }, // invalid: number instead of string
    sessionState: "state000",
  } as unknown;

  assert.throws(
    () => JmapResponseEnvelope.fromJson(badJson),
    (err) => {
      assert(err instanceof JmapProtocolError);
      assert.match((err as Error).message, /createdIds entry/);
      return true;
    },
    "Expected JmapProtocolError for invalid createdIds entry"
  );
});
