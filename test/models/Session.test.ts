import test from "node:test";
import assert from "node:assert/strict";
import { Session, Account, CoreCapability } from "../../src/models/Session";

/* Normal round‑trip serialization */
test("Session.fromJson and toJson round‑trip", () => {
  const raw = {
    capabilities: {
      "urn:ietf:params:jmap:core": {
        maxSizeUpload: 50000000,
        maxConcurrentUpload: 4,
        maxSizeRequest: 10000000,
        maxConcurrentRequests: 8,
        maxCallsInRequest: 16,
        maxObjectsInGet: 500,
        maxObjectsInSet: 250,
        collationAlgorithms: ["i;unicode-casemap"],
      },
    },
    accounts: {
      "acc-1": {
        name: "Test Account",
        isPersonal: true,
        isReadOnly: false,
        accountCapabilities: {
          "urn:ietf:params:jmap:mail": {},
        },
      },
    },
    primaryAccounts: {
      "urn:ietf:params:jmap:mail": "acc-1",
    },
    username: "user@example.test",
    apiUrl: "/jmap/",
    downloadUrl: "/download/{accountId}/{blobId}/{type}/{name}",
    uploadUrl: "/upload/{accountId}",
    eventSourceUrl: "/events",
    state: "abc123",
  };

  const session = Session.fromJson(raw);
  assert.ok(session instanceof Session);
  assert.ok(session.accounts["acc-1"] instanceof Account);

  const coreCap = CoreCapability.fromJson(
    raw.capabilities["urn:ietf:params:jmap:core"]
  );
  assert.ok(coreCap instanceof CoreCapability);

  const roundTrip = session.toJson();
  assert.deepEqual(roundTrip, raw);
});

/* Missing required top‑level field */
test("Session.fromJson throws when a required field is missing", () => {
  const incomplete = {
    // capabilities omitted intentionally
    accounts: {},
    primaryAccounts: {},
    username: "user@example.test",
    apiUrl: "/jmap/",
    downloadUrl: "/download",
    uploadUrl: "/upload",
    eventSourceUrl: "/events",
    state: "state",
  };

  assert.throws(
    () => {
      Session.fromJson(incomplete as any);
    },
    {
      name: "Error",
      message: "Session.fromJson: missing required fields",
    }
  );
});

/* Invalid primaryAccounts entry */
test("Session.fromJson validates primaryAccounts values are strings", () => {
  const badPrimary = {
    capabilities: {},
    accounts: {},
    primaryAccounts: { "urn:ietf:params:jmap:mail": 123 as any },
    username: "user@example.test",
    apiUrl: "/jmap/",
    downloadUrl: "/download",
    uploadUrl: "/upload",
    eventSourceUrl: "/events",
    state: "state",
  };

  assert.throws(
    () => {
      Session.fromJson(badPrimary as any);
    },
    {
      name: "Error",
      message: /primaryAccounts\[.*\] must be a string/,
    }
  );
});

/* CoreCapability collationAlgorithms validation */
test("CoreCapability.fromJson rejects non‑string collationAlgorithms entries", () => {
  const badCap = {
    maxSizeUpload: 10,
    maxConcurrentUpload: 2,
    maxSizeRequest: 5,
    maxConcurrentRequests: 3,
    maxCallsInRequest: 1,
    maxObjectsInGet: 100,
    maxObjectsInSet: 50,
    collationAlgorithms: [123, "valid"],
  };

  assert.throws(
    () => {
      CoreCapability.fromJson(badCap as any);
    },
    {
      name: "Error",
      message:
        "CoreCapability.fromJson: collationAlgorithms must be an array of strings",
    }
  );
});
