/**
 * Unit tests for {@link JmapClientCore}.
 *
 * These tests use a stub transport that records the HTTP request and returns
 * canned responses. No real network access is performed.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { JmapClientCore, JmapClientOptions } from "../src/client-core";
import { JmapTransport, JmapHttpRequest, JmapHttpResponse } from "../src/models/Transport";
import { JmapProtocolError } from "../src/models/CommonTypes";

/**
 * Stub transport that records the last request and returns a pre‑configured response.
 */
class StubTransport implements JmapTransport {
  public lastRequest?: JmapHttpRequest;
  public response?: JmapHttpResponse;

  async send(request: JmapHttpRequest): Promise<JmapHttpResponse> {
    this.lastRequest = request;
    if (!this.response) {
      throw new Error("StubTransport: no response configured");
    }
    return this.response;
  }
}

/**
 * Helper to build a client instance with a stub transport.
 */
function buildClient(stub: StubTransport): JmapClientCore {
  const opts: JmapClientOptions = {
    sessionUrl: "https://example.com/.well-known/jmap",
    username: "user",
    password: "pass",
    transport: stub,
  };
  return new JmapClientCore(opts);
}

/**
 * Minimal valid Session JSON required by the client.
 */
const sessionJson = {
  username: "user",
  apiUrl: "https://example.com/api",
  downloadUrl: "https://example.com/download/{accountId}/{blobId}/{type}/{name}",
  uploadUrl: "https://example.com/upload/{accountId}",
  eventSourceUrl: "https://example.com/event",
  capabilities: {},
  accounts: {},
  primaryAccounts: {},
  state: "s1",
};

test("connect() fetches session and returns Session object", async (t) => {
  const stub = new StubTransport();
  stub.response = new JmapHttpResponse({
    status: 200,
    headers: { "content-type": "application/json" },
    body: Buffer.from(JSON.stringify(sessionJson)),
  });

  const client = buildClient(stub);
  const session = await client.connect();

  // Verify parsed session fields.
  assert.equal(session.apiUrl, sessionJson.apiUrl);
  assert.equal(session.uploadUrl, sessionJson.uploadUrl);
  assert.equal(session.downloadUrl, sessionJson.downloadUrl);

  // Verify HTTP request details.
  assert.ok(stub.lastRequest);
  assert.equal(stub.lastRequest?.method, "GET");
  assert.equal(stub.lastRequest?.url, "https://example.com/.well-known/jmap");
  const authHeader = stub.lastRequest?.headers["Authorization"];
  assert.ok(authHeader?.startsWith("Basic "));
});

test("connect() uses a Bearer Authorization header when bearerToken is provided", async (t) => {
  const stub = new StubTransport();
  stub.response = new JmapHttpResponse({
    status: 200,
    headers: { "content-type": "application/json" },
    body: Buffer.from(JSON.stringify(sessionJson)),
  });

  const opts: JmapClientOptions = {
    sessionUrl: "https://example.com/.well-known/jmap",
    username: "user",
    password: "pass",
    bearerToken: "my-oauth-token",
    transport: stub,
  };
  const client = new JmapClientCore(opts);
  await client.connect();

  assert.ok(stub.lastRequest);
  const authHeader = stub.lastRequest?.headers["Authorization"];
  assert.equal(authHeader, "Bearer my-oauth-token");
});

test("echo() sends correct JMAP request and returns echoed arguments", async (t) => {
  const stub = new StubTransport();

  // First response: session.
  stub.response = new JmapHttpResponse({
    status: 200,
    headers: { "content-type": "application/json" },
    body: Buffer.from(JSON.stringify(sessionJson)),
  });
  const client = buildClient(stub);
  await client.connect();

  // Second response: echo result.
  const echoResp = {
    methodResponses: [
      ["Core/echo", { hello: true, high: 5 }, "c1"],
    ],
    sessionState: "state1",
  };
  stub.response = new JmapHttpResponse({
    status: 200,
    headers: { "content-type": "application/json" },
    body: Buffer.from(JSON.stringify(echoResp)),
  });

  const args = { hello: true, high: 5 };
  const result = await client.echo(args);

  // Verify returned arguments.
  assert.deepEqual(result, args);

  // Verify request payload.
  assert.ok(stub.lastRequest);
  assert.equal(stub.lastRequest?.method, "POST");
  assert.equal(stub.lastRequest?.url, sessionJson.apiUrl);
  assert.equal(stub.lastRequest?.headers["Content-Type"], "application/json");
  const body = stub.lastRequest?.body ?? Buffer.alloc(0);
  const parsed = JSON.parse(body.toString("utf-8"));
  assert.deepEqual(parsed.using, ["urn:ietf:params:jmap:core"]);
  const call = parsed.methodCalls[0];
  assert.equal(call[0], "Core/echo");
  assert.deepEqual(call[1], args);
  assert.equal(call[2], "c1");
});

test("uploadBlob() posts data and parses response", async (t) => {
  const stub = new StubTransport();

  // Session response.
  stub.response = new JmapHttpResponse({
    status: 200,
    headers: { "content-type": "application/json" },
    body: Buffer.from(JSON.stringify(sessionJson)),
  });
  const client = buildClient(stub);
  await client.connect();

  // Upload response.
  const uploadResp = {
    accountId: "A1",
    blobId: "b123",
    type: "text/plain",
    size: 11,
  };
  stub.response = new JmapHttpResponse({
    status: 200,
    headers: { "content-type": "application/json" },
    body: Buffer.from(JSON.stringify(uploadResp)),
  });

  const result = await client.uploadBlob("A1", Buffer.from("Hello World"), "text/plain");

  // Verify parsed result.
  assert.deepEqual(result, uploadResp);

  // Verify request details.
  assert.ok(stub.lastRequest);
  assert.equal(stub.lastRequest?.method, "POST");
  const expectedUrl = sessionJson.uploadUrl.replace("{accountId}", encodeURIComponent("A1"));
  assert.equal(stub.lastRequest?.url, expectedUrl);
  assert.equal(stub.lastRequest?.headers["Content-Type"], "text/plain");
  assert.deepEqual(stub.lastRequest?.body, Buffer.from("Hello World"));
});

test("downloadBlob() performs GET and returns content with type", async (t) => {
  const stub = new StubTransport();

  // Session response.
  stub.response = new JmapHttpResponse({
    status: 200,
    headers: { "content-type": "application/json" },
    body: Buffer.from(JSON.stringify(sessionJson)),
  });
  const client = buildClient(stub);
  await client.connect();

  // Download response. Not valid UTF-8 (starts like a PNG magic number) - a prior version
  // read the response via response.text(), which corrupts/crashes on non-text content.
  const blobContent = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  stub.response = new JmapHttpResponse({
    status: 200,
    headers: { "content-type": "image/png" },
    body: blobContent,
  });

  const result = await client.downloadBlob("A1", "b123", "image/png", "file.png");

  // Verify returned payload - bytes must round-trip exactly.
  assert.deepEqual(result.content, blobContent);
  assert.equal(result.contentType, "image/png");

  // Verify request URL.
  assert.ok(stub.lastRequest);
  assert.equal(stub.lastRequest?.method, "GET");
  const expectedUrl = sessionJson.downloadUrl
    .replace("{accountId}", encodeURIComponent("A1"))
    .replace("{blobId}", encodeURIComponent("b123"))
    .replace("{type}", encodeURIComponent("image/png"))
    .replace("{name}", encodeURIComponent("file.png"));
  assert.equal(stub.lastRequest?.url, expectedUrl);
});

test("sendRequest() propagates protocol error as JmapProtocolError", async (t) => {
  const stub = new StubTransport();

  // Session response.
  stub.response = new JmapHttpResponse({
    status: 200,
    headers: { "content-type": "application/json" },
    body: Buffer.from(JSON.stringify(sessionJson)),
  });
  const client = buildClient(stub);
  await client.connect();

  // Error response.
  const errorResp = {
    methodResponses: [
      ["error", { type: "unknownMethod", description: "Method not found" }, "c1"],
    ],
    sessionState: "state2",
  };
  stub.response = new JmapHttpResponse({
    status: 200,
    headers: { "content-type": "application/json" },
    body: Buffer.from(JSON.stringify(errorResp)),
  });

  await assert.rejects(
    async () => {
      await client.echo({ test: 1 });
    },
    (err: unknown) => {
      assert.ok(err instanceof JmapProtocolError);
      const e = err as JmapProtocolError;
      assert.equal(e.type, "unknownMethod");
      assert.equal(e.description, "Method not found");
      return true;
    }
  );
});

/* -------------------------------------------------------------------------- */
/* AsyncDisposable / `await using` support                                    */
/* -------------------------------------------------------------------------- */
test("JmapClientCore participates in `await using` scoped disposal", async (t) => {
  // Regression test: a prior version's close() was a disconnected no-op stub, never wired
  // to Symbol.asyncDispose - so it did not participate in native `await using` scoped
  // disposal, unlike the RAII-style disposal every other language target in this project
  // provides (Python __exit__, C# IDisposable, C++ RAII, etc.).
  const stub = new StubTransport();
  let closed = false;

  class TrackingClient extends JmapClientCore {
    public override async close(): Promise<void> {
      closed = true;
      await super.close();
    }
  }

  {
    await using client = new TrackingClient({
      sessionUrl: "https://example.com/.well-known/jmap",
      username: "user",
      password: "pass",
      transport: stub,
    });
    assert.ok(client);
  }

  assert.equal(closed, true, "close() must be called when the `await using` block exits");
});

/* -------------------------------------------------------------------------- */
/* Non-2xx error bodies                                                       */
/* -------------------------------------------------------------------------- */
test("connect() includes the response body in the error for a non-200 status", async (t) => {
  // Regression test: a prior version discarded the response body entirely on a non-2xx
  // status, keeping only the bare status code. Real JMAP servers commonly return an RFC
  // 8620 section 3.6.1 "problem details" JSON body explaining exactly what went wrong -
  // silently dropping it makes debugging a failed request much harder than necessary.
  const stub = new StubTransport();
  stub.response = new JmapHttpResponse({
    status: 400,
    headers: {},
    body: Buffer.from(JSON.stringify({ type: "urn:ietf:params:jmap:error:notJSON", detail: "bad request body" })),
  });

  const client = buildClient(stub);
  await assert.rejects(
    () => client.connect(),
    (err: unknown) => err instanceof Error && err.message.includes("bad request body"),
  );
});
