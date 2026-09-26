import { test } from "node:test";
import assert from "node:assert";
import { JmapRequestEnvelope } from "../../src/models/JmapRequestEnvelope";
import { Invocation } from "../../src/models/Invocation";

test("JmapRequestEnvelope round‑trip with createdIds", () => {
  const invocation = new Invocation({
    name: "Mail/get",
    arguments: { accountId: "acc123", ids: ["id1"] },
    methodCallId: "call-1",
  });

  const envelope = new JmapRequestEnvelope({
    using: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    methodCalls: [invocation],
    createdIds: { clientId1: "serverIdA" },
  });

  const json = envelope.toJson();
  assert.deepStrictEqual(json, {
    using: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    methodCalls: [
      ["Mail/get", { accountId: "acc123", ids: ["id1"] }, "call-1"],
    ],
    createdIds: { clientId1: "serverIdA" },
  });

  const parsed = JmapRequestEnvelope.fromJson(json);
  assert.deepStrictEqual(parsed.using, envelope.using);
  assert.deepStrictEqual(parsed.createdIds, envelope.createdIds);
  assert.strictEqual(parsed.methodCalls.length, 1);
  const parsedInv = parsed.methodCalls[0];
  assert.strictEqual(parsedInv.name, invocation.name);
  assert.deepStrictEqual(parsedInv.arguments, invocation.arguments);
  assert.strictEqual(parsedInv.methodCallId, invocation.methodCallId);
});

test("JmapRequestEnvelope handles null createdIds", () => {
  const invocation = new Invocation({
    name: "Identity/get",
    arguments: { accountId: "acc456" },
    methodCallId: "call-2",
  });

  const envelope = new JmapRequestEnvelope({
    using: ["urn:ietf:params:jmap:core"],
    methodCalls: [invocation],
    createdIds: null,
  });

  const json = envelope.toJson();
  assert.deepStrictEqual(json.createdIds, null);

  const parsed = JmapRequestEnvelope.fromJson(json);
  assert.strictEqual(parsed.createdIds, null);
  assert.deepStrictEqual(parsed.using, envelope.using);
  assert.strictEqual(parsed.methodCalls.length, 1);
  assert.strictEqual(parsed.methodCalls[0].methodCallId, "call-2");
});

test("JmapRequestEnvelope.fromJson throws on invalid using", () => {
  const badJson = {
    using: [123, "urn:ietf:params:jmap:core"], // number is invalid
    methodCalls: [],
    createdIds: null,
  };

  assert.throws(() => {
    JmapRequestEnvelope.fromJson(badJson as unknown);
  }, /Invalid JmapRequestEnvelope: 'using' must be an array of strings/);
});

test("JmapRequestEnvelope.fromJson treats missing createdIds as null", () => {
  const json = {
    using: ["urn:ietf:params:jmap:core"],
    methodCalls: [
      ["Mail/get", { accountId: "acc789" }, "call-3"],
    ],
    // createdIds omitted intentionally
  };

  const parsed = JmapRequestEnvelope.fromJson(json as unknown);
  assert.strictEqual(parsed.createdIds, null);
  assert.deepStrictEqual(parsed.using, ["urn:ietf:params:jmap:core"]);
  assert.strictEqual(parsed.methodCalls.length, 1);
  assert.strictEqual(parsed.methodCalls[0].methodCallId, "call-3");
});
