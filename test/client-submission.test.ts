/**
 * Unit tests for the Submission mixin methods on a client composed from
 * {@link JmapClientCore} and {@link SubmissionClientMixin}.
 *
 * The tests use a hand‑rolled stub transport that records the outgoing request
 * and returns canned JSON responses. They verify request payloads, response
 * handling (including merging of server‑provided fields), optional arguments,
 * and error handling.
 */
import test from "node:test";
import assert from "node:assert";

import { JmapClientCore, JmapClientOptions } from "../src/client-core";
import { SubmissionClientMixin } from "../src/client-submission";
import { EmailSubmission } from "../src/models/EmailSubmission";
import { Comparator } from "../src/models/Comparator";
import { JmapProtocolError } from "../src/models/CommonTypes";

/**
 * Minimal Session JSON required by {@link Session.fromJson}.
 */
const SESSION_JSON = {
  username: "user@example.test",
  apiUrl: "https://jmap.example.test/api",
  uploadUrl: "https://jmap.example.test/upload/{accountId}",
  downloadUrl:
    "https://jmap.example.test/download/{accountId}/{blobId}/{type}/{name}",
  eventSourceUrl: "https://jmap.example.test/events",
  state: "s1",
  capabilities: {
    "urn:ietf:params:jmap:core": {},
    "urn:ietf:params:jmap:mail": {},
    "urn:ietf:params:jmap:submission": {},
  },
  primaryAccounts: {
    "urn:ietf:params:jmap:mail": "account1",
    "urn:ietf:params:jmap:submission": "account1",
  },
  accounts: {
    account1: {},
  },
};

/**
 * Stub transport that records the last request and returns a predetermined
 * response based on the request method.
 */
class StubTransport {
  public lastRequest?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: Buffer;
  };

  constructor(
    private readonly responseFactory: (req: {
      method: string;
      url: string;
      headers: Record<string, string>;
      body?: Buffer;
    }) => {
      status: number;
      body: Buffer;
      headers: Record<string, string>;
    },
  ) {}

  async send(request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: Buffer;
  }) {
    this.lastRequest = request;
    return this.responseFactory(request);
  }
}

/**
 * Helper to create a test client instance with a stub transport that returns
 * the supplied POST response JSON and the session JSON for the initial GET.
 */
function createTestClient(postResponse: unknown) {
  const transport = new StubTransport((req) => {
    if (req.method === "GET") {
      return {
        status: 200,
        body: Buffer.from(JSON.stringify(SESSION_JSON)),
        headers: {},
      };
    }
    // POST – return the supplied envelope
    return {
      status: 200,
      body: Buffer.from(JSON.stringify(postResponse)),
      headers: {},
    };
  });

  const options: JmapClientOptions = {
    sessionUrl: "https://jmap.example.test/.well-known/jmap",
    username: "user",
    password: "pass",
    transport,
  };

  // Compose a concrete client class for the tests.
  class TestClient extends SubmissionClientMixin(JmapClientCore) {}
  const client = new TestClient(options);
  return { client, transport };
}

/* -------------------------------------------------------------------------- */
/* send() – normal case                                                       */
/* -------------------------------------------------------------------------- */
test("SubmissionClientMixin.send merges server fields", async () => {
  const postResponse = {
    sessionState: "s1",
    methodResponses: [
      [
        "EmailSubmission/set",
        {
          accountId: "account1",
          newState: "1",
          created: {
            c1: {
              id: "s1",
              sendAt: "2026-08-18T10:00:00Z",
              undoStatus: "final",
            },
          },
        },
        "c1",
      ],
    ],
  };

  const { client, transport } = createTestClient(postResponse);
  await client.connect();

  const submission = new EmailSubmission({ identityId: "id1", emailId: "e1" });
  const result = await client.send("account1", submission);

  // Verify merged fields
  assert.strictEqual(result.id, "s1");
  assert.strictEqual(result.identityId, "id1");
  assert.strictEqual(result.emailId, "e1");
  assert.strictEqual(result.sendAt, "2026-08-18T10:00:00Z");
  assert.strictEqual(result.undoStatus, "final");

  // Verify request payload
  assert.ok(transport.lastRequest);
  assert.strictEqual(transport.lastRequest!.method, "POST");
  const reqBody = JSON.parse(transport.lastRequest!.body!.toString("utf-8"));
  const invocation = reqBody.methodCalls[0];
  assert.strictEqual(invocation[0], "EmailSubmission/set");
  const args = invocation[1];
  assert.strictEqual(args.accountId, "account1");
  assert.deepStrictEqual(args.create.c1, submission.toJson());
});

/* -------------------------------------------------------------------------- */
/* cancelSend() – ensure request is formed correctly                           */
/* -------------------------------------------------------------------------- */
test("SubmissionClientMixin.cancelSend sends correct update", async () => {
  const postResponse = {
    sessionState: "s2",
    methodResponses: [
      [
        "EmailSubmission/set",
        {
          accountId: "account1",
          newState: "2",
        },
        "c1",
      ],
    ],
  };

  const { client, transport } = createTestClient(postResponse);
  await client.connect();

  await client.cancelSend("account1", "sub123");

  // Verify request payload
  assert.ok(transport.lastRequest);
  assert.strictEqual(transport.lastRequest!.method, "POST");
  const reqBody = JSON.parse(transport.lastRequest!.body!.toString("utf-8"));
  const invocation = reqBody.methodCalls[0];
  assert.strictEqual(invocation[0], "EmailSubmission/set");
  const args = invocation[1];
  assert.strictEqual(args.accountId, "account1");
  // Regression test: a PatchObject key is a JSON Pointer (RFC 6901) relative to the
  // patched object - a bare top-level property name has no leading slash. A prior
  // version sent "/undoStatus" (pointing at a differently-named property instead),
  // which a real JMAP server rejects/ignores, silently breaking cancel-send.
  assert.deepStrictEqual(args.update, {
    sub123: { undoStatus: "canceled" },
  });
});

/* -------------------------------------------------------------------------- */
/* listSubmissions() – with total                                            */
/* -------------------------------------------------------------------------- */
test("SubmissionClientMixin.listSubmissions returns full result with total", async () => {
  const postResponse = {
    sessionState: "s3",
    methodResponses: [
      [
        "EmailSubmission/query",
        {
          accountId: "account1",
          queryState: "qs1",
          canCalculateChanges: true,
          position: 0,
          ids: ["sub1", "sub2"],
          total: 2,
        },
        "c1",
      ],
    ],
  };

  const { client, transport } = createTestClient(postResponse);
  await client.connect();

  const result = await client.listSubmissions("account1", null, null, 0, null, true);

  // Verify parsed result
  assert.strictEqual(result.accountId, "account1");
  assert.strictEqual(result.queryState, "qs1");
  assert.strictEqual(result.canCalculateChanges, true);
  assert.strictEqual(result.position, 0);
  assert.deepStrictEqual(result.ids, ["sub1", "sub2"]);
  assert.strictEqual(result.total, 2);

  // Verify request arguments
  assert.ok(transport.lastRequest);
  const reqBody = JSON.parse(transport.lastRequest!.body!.toString("utf-8"));
  const args = reqBody.methodCalls[0][1];
  assert.strictEqual(args.accountId, "account1");
  assert.strictEqual(args.calculateTotal, true);
});

/* -------------------------------------------------------------------------- */
/* listSubmissions() – without total (edge case)                              */
/* -------------------------------------------------------------------------- */
test("SubmissionClientMixin.listSubmissions handles missing total", async () => {
  const postResponse = {
    sessionState: "s4",
    methodResponses: [
      [
        "EmailSubmission/query",
        {
          accountId: "account1",
          queryState: "qs2",
          canCalculateChanges: false,
          position: 5,
          ids: ["sub5"],
          // total omitted intentionally
        },
        "c1",
      ],
    ],
  };

  const { client, transport } = createTestClient(postResponse);
  await client.connect();

  const result = await client.listSubmissions("account1");

  assert.strictEqual(result.accountId, "account1");
  assert.strictEqual(result.queryState, "qs2");
  assert.strictEqual(result.canCalculateChanges, false);
  assert.strictEqual(result.position, 5);
  assert.deepStrictEqual(result.ids, ["sub5"]);
  assert.strictEqual(result.total, undefined);
});

/* -------------------------------------------------------------------------- */
/* send() – error when created entry missing (protocol error path)            */
/* -------------------------------------------------------------------------- */
test("SubmissionClientMixin.send throws JmapProtocolError on malformed response", async () => {
  const malformedResponse = {
    sessionState: "s5",
    methodResponses: [
      [
        "EmailSubmission/set",
        {
          accountId: "account1",
          newState: "1",
          // 'created' map missing entirely
        },
        "c1",
      ],
    ],
  };

  const { client } = createTestClient(malformedResponse);
  await client.connect();

  const submission = new EmailSubmission({ identityId: "id1", emailId: "e1" });

  await assert.rejects(
    async () => {
      await client.send("account1", submission);
    },
    (err: any) => err instanceof JmapProtocolError && err.type === "invalidResponse",
    "Expected JmapProtocolError due to missing created entry",
  );
});
