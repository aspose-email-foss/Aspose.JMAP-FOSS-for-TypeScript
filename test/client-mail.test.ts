/**
 * Unit tests for the public {@link JmapClient} mail methods.
 *
 * These tests use a hand‑rolled stub transport that records the request
 * sent and returns canned JMAP responses. No network access is performed.
 */
import test from "node:test";
import assert from "node:assert";

import {
  JmapClient,
  JmapClientOptions,
  JmapProtocolError,
} from "../src"; // public entry point re‑exports core symbols
import { Mailbox, Email, Identity, Comparator } from "../src";
import {
  JmapTransport,
  JmapHttpRequest,
  JmapHttpResponse,
} from "../src/models/Transport";

/**
 * Minimal stub transport that records the last request and delegates response
 * generation to a user‑supplied handler.
 */
class StubTransport implements JmapTransport {
  public lastRequest: JmapHttpRequest | null = null;
  constructor(
    private readonly handler: (req: JmapHttpRequest) => Promise<JmapHttpResponse>,
  ) {}

  async send(req: JmapHttpRequest): Promise<JmapHttpResponse> {
    this.lastRequest = req;
    return this.handler(req);
  }
}

/**
 * Helper to create a client with a stub transport that returns the given
 * response bodies for GET (session) and POST (JMAP) requests.
 */
function makeClient(
  postHandler: (req: JmapHttpRequest) => Promise<JmapHttpResponse>,
) {
  const transport = new StubTransport(async (req) => {
    if (req.method === "GET") {
      // Minimal session object – only required fields.
      const session = {
        username: "user@example.com",
        apiUrl: "https://example.com/api",
        downloadUrl:
          "https://example.com/download/{accountId}/{blobId}/{type}/{name}",
        uploadUrl: "https://example.com/upload/{accountId}",
        eventSourceUrl: "https://example.com/events",
        state: "s1",
        capabilities: { "urn:ietf:params:jmap:mail": {} },
        accounts: {},
        primaryAccounts: {},
      };
      return new JmapHttpResponse({
        status: 200,
        headers: {},
        body: Buffer.from(JSON.stringify(session)),
      });
    }
    // POST – delegate to the test‑specific handler.
    return postHandler(req);
  });

  const options: JmapClientOptions = {
    sessionUrl: "https://example.com/.well-known/jmap",
    username: "user",
    password: "pass",
    transport,
  };

  const client = new JmapClient(options);
  return { client, transport };
}

/**
 * Wraps a JSON envelope into the shape expected by {@link JmapResponseEnvelope.fromJson}.
 */
function envelope(
  methodName: string,
  args: Record<string, unknown>,
  callId = "c1",
) {
  return {
    methodResponses: [[methodName, args, callId]],
    sessionState: "0",
  };
}

/* -------------------------------------------------------------------------- */
/*  listMailboxes – normal case                                               */
/* -------------------------------------------------------------------------- */
test("listMailboxes returns parsed Mailbox objects", async () => {
  const { client, transport } = makeClient(async (req) => {
    const body = JSON.parse((req.body as Buffer).toString("utf-8"));
    const method = body.methodCalls[0][0];
    assert.strictEqual(method, "Mailbox/get");
    const resp = envelope("Mailbox/get", {
      accountId: "a1",
      state: "1",
      list: [
        {
          id: "mb1",
          name: "Inbox",
          parentId: null,
          role: "inbox",
          sortOrder: 0,
          totalEmails: 3,
          unreadEmails: 1,
          totalThreads: 3,
          unreadThreads: 1,
          myRights: {
            mayReadItems: true,
            mayAddItems: true,
            mayRemoveItems: true,
            maySetSeen: true,
            maySetKeywords: true,
            mayCreateChild: true,
            mayRename: false,
            mayDelete: false,
            maySubmit: true,
          },
          isSubscribed: true,
        },
      ],
      notFound: [],
    });
    return new JmapHttpResponse({
      status: 200,
      headers: {},
      body: Buffer.from(JSON.stringify(resp)),
    });
  });

  await client.connect();
  const mailboxes = await client.listMailboxes("a1");
  assert.strictEqual(mailboxes.length, 1);
  const mb = mailboxes[0];
  assert.strictEqual(mb.id, "mb1");
  assert.strictEqual(mb.name, "Inbox");
  assert.strictEqual(mb.isSubscribed, true);

  // Verify the request payload.
  assert.ok(transport.lastRequest);
  const sentBody = JSON.parse(transport.lastRequest!.body?.toString("utf-8") ?? "");
  assert.strictEqual(sentBody.methodCalls[0][0], "Mailbox/get");
  assert.deepStrictEqual(sentBody.methodCalls[0][1], {
    accountId: "a1",
    ids: null,
    properties: null,
  });
});

/* -------------------------------------------------------------------------- */
/*  createMailbox – merges server‑assigned fields                              */
/* -------------------------------------------------------------------------- */
test("createMailbox merges server partial response", async () => {
  const { client, transport } = makeClient(async (req) => {
    const body = JSON.parse((req.body as Buffer).toString("utf-8"));
    const method = body.methodCalls[0][0];
    assert.strictEqual(method, "Mailbox/set");
    const resp = envelope("Mailbox/set", {
      accountId: "a1",
      oldState: null,
      newState: "2",
      created: { new: { id: "mb2" } },
    });
    return new JmapHttpResponse({
      status: 200,
      headers: {},
      body: Buffer.from(JSON.stringify(resp)),
    });
  });

  await client.connect();
  const newMb = new Mailbox({ name: "NewBox", sortOrder: 10, isSubscribed: false });
  const created = await client.createMailbox("a1", newMb);
  assert.strictEqual(created.id, "mb2");
  assert.strictEqual(created.name, "NewBox");

  // Verify request arguments contain the serialized mailbox.
  const sent = JSON.parse(transport.lastRequest!.body?.toString("utf-8") ?? "");
  const createMap = sent.methodCalls[0][1].create;
  assert.deepStrictEqual(createMap, { new: newMb.toJson() });
});

/* -------------------------------------------------------------------------- */
/*  listMailboxes – protocol error path                                        */
/* -------------------------------------------------------------------------- */
test("listMailboxes propagates protocol error as JmapProtocolError", async () => {
  const { client } = makeClient(async (req) => {
    const resp = envelope("error", { type: "unknownMethod", description: "Bad" });
    return new JmapHttpResponse({
      status: 200,
      headers: {},
      body: Buffer.from(JSON.stringify(resp)),
    });
  });

  await client.connect();
  await assert.rejects(
    async () => {
      await client.listMailboxes("a1");
    },
    (err: unknown) => {
      assert.ok(err instanceof JmapProtocolError);
      const e = err as JmapProtocolError;
      assert.strictEqual(e.type, "unknownMethod");
      assert.strictEqual(e.description, "Bad");
      return true;
    },
  );
});

/* -------------------------------------------------------------------------- */
/*  listMessages – single Email/query call, normal case                       */
/* -------------------------------------------------------------------------- */
test("listMessages performs a single Email/query call", async () => {
  const { client, transport } = makeClient(async (req) => {
    const body = JSON.parse((req.body as Buffer).toString("utf-8"));
    const method = body.methodCalls[0][0];
    assert.strictEqual(method, "Email/query");
    const resp = envelope("Email/query", {
      accountId: "a1",
      queryState: "q1",
      canCalculateChanges: false,
      position: 0,
      ids: ["e1", "e2"],
      total: 2,
      limit: 10,
    });
    return new JmapHttpResponse({
      status: 200,
      headers: {},
      body: Buffer.from(JSON.stringify(resp)),
    });
  });

  await client.connect();
  const result = await client.listMessages("a1", { inMailbox: "mb1" }, undefined, 10);

  assert.strictEqual(result.accountId, "a1");
  assert.strictEqual(result.queryState, "q1");
  assert.strictEqual(result.canCalculateChanges, false);
  assert.strictEqual(result.position, 0);
  assert.deepStrictEqual(result.ids, ["e1", "e2"]);
  assert.strictEqual(result.total, 2);
  assert.strictEqual(result.limit, 10);

  // Only a single Email/query call should have been made.
  assert.ok(transport.lastRequest);
  const lastBody = JSON.parse(transport.lastRequest!.body?.toString("utf-8") ?? "");
  assert.strictEqual(lastBody.methodCalls.length, 1);
  assert.strictEqual(lastBody.methodCalls[0][0], "Email/query");
});

/* -------------------------------------------------------------------------- */
/*  listMessages – empty ids                                                  */
/* -------------------------------------------------------------------------- */
test("listMessages returns empty ids when query yields no matches", async () => {
  const { client } = makeClient(async (req) => {
    const body = JSON.parse((req.body as Buffer).toString("utf-8"));
    const method = body.methodCalls[0][0];
    assert.strictEqual(method, "Email/query");
    const resp = envelope("Email/query", {
      accountId: "a1",
      queryState: "q0",
      canCalculateChanges: false,
      position: 0,
      ids: [],
      total: 0,
      limit: 10,
    });
    return new JmapHttpResponse({
      status: 200,
      headers: {},
      body: Buffer.from(JSON.stringify(resp)),
    });
  });

  await client.connect();
  const result = await client.listMessages("a1");

  assert.strictEqual(result.accountId, "a1");
  assert.strictEqual(result.queryState, "q0");
  assert.strictEqual(result.canCalculateChanges, false);
  assert.strictEqual(result.position, 0);
  assert.deepStrictEqual(result.ids, []);
  assert.strictEqual(result.total, 0);
  assert.strictEqual(result.limit, 10);
});

/* -------------------------------------------------------------------------- */
/*  listIdentities – normal case                                               */
/* -------------------------------------------------------------------------- */
test("listIdentities returns parsed Identity objects", async () => {
  const { client, transport } = makeClient(async (req) => {
    const body = JSON.parse((req.body as Buffer).toString("utf-8"));
    const method = body.methodCalls[0][0];
    assert.strictEqual(method, "Identity/get");
    const resp = envelope("Identity/get", {
      accountId: "a1",
      state: "1",
      list: [
        {
          id: "id1",
          name: "Work",
          email: "work@example.com",
          replyTo: null,
          bcc: null,
          textSignature: "",
          htmlSignature: "",
        },
      ],
      notFound: [],
    });
    return new JmapHttpResponse({
      status: 200,
      headers: {},
      body: Buffer.from(JSON.stringify(resp)),
    });
  });

  await client.connect();
  const ids = await client.listIdentities("a1");
  assert.strictEqual(ids.length, 1);
  const id = ids[0];
  assert.strictEqual(id.id, "id1");
  assert.strictEqual(id.email, "work@example.com");

  // Verify request payload.
  assert.ok(transport.lastRequest);
  const sent = JSON.parse(transport.lastRequest!.body?.toString("utf-8") ?? "");
  assert.strictEqual(sent.methodCalls[0][0], "Identity/get");
  assert.deepStrictEqual(sent.methodCalls[0][1], {
    accountId: "a1",
    ids: null,
    properties: null,
  });
});

/* -------------------------------------------------------------------------- */
/*  setMessageKeyword – set and clear a keyword                                 */
/* -------------------------------------------------------------------------- */
test("setMessageKeyword updates keywords on messages", async () => {
  const { client, transport } = makeClient(async (req) => {
    const body = JSON.parse((req.body as Buffer).toString("utf-8"));
    const method = body.methodCalls[0][0];
    assert.strictEqual(method, "Email/set");
    const resp = envelope("Email/set", {
      accountId: "a1",
      oldState: null,
      newState: "3",
      updated: {
        e1: { id: "e1", keywords: { "$seen": true } },
        e2: { id: "e2", keywords: { "$seen": true } },
      },
    });
    return new JmapHttpResponse({
      status: 200,
      headers: {},
      body: Buffer.from(JSON.stringify(resp)),
    });
  });

  await client.connect();
  const updated = await client.setMessageKeyword("a1", ["e1", "e2"], "$seen", true);
  assert.strictEqual(updated.length, 2);
  assert.strictEqual(updated[0].keywords?.["$seen"], true);
  assert.strictEqual(updated[1].keywords?.["$seen"], true);

  // Verify request arguments contain the correct keyword map.
  const sent = JSON.parse(transport.lastRequest!.body?.toString("utf-8") ?? "");
  const updateMap = sent.methodCalls[0][1].update;
  assert.deepStrictEqual(updateMap, {
    e1: { keywords: { $seen: true } },
    e2: { keywords: { $seen: true } },
  });
});

/* -------------------------------------------------------------------------- */
/*  listMailboxes – malformed empty response                                  */
/* -------------------------------------------------------------------------- */
test("listMailboxes throws JmapProtocolError on empty methodResponses", async () => {
  // Regression test: a malformed/empty server response ({"methodResponses": []}) must
  // raise JmapProtocolError, not a raw TypeError from indexing methodResponses[0]
  // unguarded - a caller catching only JmapError would otherwise be broken by an
  // unrelated exception type leaking through.
  const { client } = makeClient(async () => {
    const resp = { methodResponses: [], sessionState: "0" };
    return new JmapHttpResponse({
      status: 200,
      headers: {},
      body: Buffer.from(JSON.stringify(resp)),
    });
  });

  await client.connect();
  await assert.rejects(
    () => client.listMailboxes("a1"),
    (err: unknown) => err instanceof JmapProtocolError,
  );
});
