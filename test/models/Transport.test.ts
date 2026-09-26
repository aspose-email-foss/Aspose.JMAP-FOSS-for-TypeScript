import test from "node:test";
import assert from "node:assert";

import {
    JmapHttpRequest,
    JmapHttpResponse,
    FetchTransport,
} from "../../src/models/Transport";
import { JmapNetworkError } from "../../src/models/CommonTypes";

/**
 * Minimal mock {@link Response} compatible with the fetch API.
 */
function createMockResponse(
    status: number,
    headersObj: Record<string, string>,
    body: string | Buffer,
): Response {
    const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf-8");
    return {
        status,
        headers: {
            forEach(cb: (value: string, key: string) => void) {
                for (const [k, v] of Object.entries(headersObj)) {
                    cb(v, k);
                }
            },
        } as unknown as Headers,
        async text() {
            return bodyBuffer.toString("utf-8");
        },
        // Unused members to satisfy the `Response` interface.
        ok: status >= 200 && status < 300,
        redirected: false,
        type: "default",
        url: "",
        clone() {
            return this;
        },
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => {
            const ab = new ArrayBuffer(bodyBuffer.byteLength);
            new Uint8Array(ab).set(bodyBuffer);
            return ab;
        },
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        json: async () => JSON.parse(bodyBuffer.toString("utf-8")),
    } as unknown as Response;
}

/* -------------------------------------------------------------------------- */
/* JmapHttpRequest tests                                                       */
/* -------------------------------------------------------------------------- */
test("JmapHttpRequest stores constructor arguments", () => {
    const req = new JmapHttpRequest({
        method: "POST",
        url: "https://example.com/api",
        headers: { "Content-Type": "application/json" },
        body: Buffer.from('{"foo":"bar"}'),
    });

    assert.strictEqual(req.method, "POST");
    assert.strictEqual(req.url, "https://example.com/api");
    assert.deepStrictEqual(req.headers, { "Content-Type": "application/json" });
    assert.deepStrictEqual(req.body, Buffer.from('{"foo":"bar"}'));
});

test("JmapHttpRequest defaults optional fields", () => {
    const req = new JmapHttpRequest({
        method: "GET",
        url: "/ping",
    });

    assert.deepStrictEqual(req.headers, {});
    assert.strictEqual(req.body, undefined);
});

/* -------------------------------------------------------------------------- */
/* JmapHttpResponse tests                                                      */
/* -------------------------------------------------------------------------- */
test("JmapHttpResponse stores constructor arguments", () => {
    const resp = new JmapHttpResponse({ status: 201, headers: { "x-test": "value" }, body: Buffer.from("body text") });
    assert.strictEqual(resp.status, 201);
    assert.deepStrictEqual(resp.headers, { "x-test": "value" });
    assert.deepStrictEqual(resp.body, Buffer.from("body text"));
});

/* -------------------------------------------------------------------------- */
/* FetchTransport normal operation                                            */
/* -------------------------------------------------------------------------- */
test("FetchTransport sends request with proper URL, headers and body", async () => {
    const baseUrl = "https://jmap.example.com/api";
    const username = "alice";
    const password = "secret";
    const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

    let capturedUrl: string | undefined;
    let capturedInit: RequestInit | undefined;

    const stubFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = typeof input === "string" ? input : (input as Request).url;
        capturedInit = init;
        return createMockResponse(200, { "content-type": "application/json" }, '{"ok":true}');
    };

    const transport = new FetchTransport(baseUrl, authHeader, stubFetch);

    const request = new JmapHttpRequest({
        method: "POST",
        url: "/session",
        headers: { "X-Custom": "value" },
        body: Buffer.from('{"request":"data"}'),
    });

    const response = await transport.send(request);

    // URL resolution (relative URL)
    assert.strictEqual(
        capturedUrl,
        `${baseUrl.replace(/\/+$/, "")}/${request.url.replace(/^\/+/, "")}`,
    );

    // Method and body - bytes must be passed through unchanged.
    assert.strictEqual(capturedInit?.method, "POST");
    assert.deepStrictEqual(Buffer.from(capturedInit?.body as Uint8Array), Buffer.from('{"request":"data"}'));

    // Authorization header
    assert.ok(capturedInit?.headers);
    const sentHeaders = capturedInit?.headers as Record<string, string>;
    assert.strictEqual(sentHeaders["Authorization"], authHeader);
    // Custom header preserved
    assert.strictEqual(sentHeaders["X-Custom"], "value");

    // Response mapping
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.headers, { "content-type": "application/json" });
    assert.deepStrictEqual(response.body, Buffer.from('{"ok":true}'));
});

/* -------------------------------------------------------------------------- */
/* FetchTransport binary safety                                                */
/* -------------------------------------------------------------------------- */
test("FetchTransport does not corrupt non-UTF-8 binary bodies", async () => {
    // A byte sequence that is not valid UTF-8 (starts like a PNG magic number) - a prior
    // version read the response via response.text(), which corrupts (or, for a genuinely
    // invalid sequence, mangles via the replacement character) non-text content such as an
    // image or PDF attachment.
    const binaryPayload = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    let capturedInit: RequestInit | undefined;
    const stubFetch: typeof fetch = async (_, init?: RequestInit) => {
        capturedInit = init;
        return createMockResponse(200, { "content-type": "application/octet-stream" }, binaryPayload);
    };

    const transport = new FetchTransport("https://jmap.example.com/api", "Basic dTpw", stubFetch);
    const request = new JmapHttpRequest({
        method: "POST",
        url: "/upload",
        body: binaryPayload,
    });

    const response = await transport.send(request);

    assert.deepStrictEqual(Buffer.from(capturedInit?.body as Uint8Array), binaryPayload);
    assert.deepStrictEqual(response.body, binaryPayload);
});

/* -------------------------------------------------------------------------- */
/* FetchTransport absolute URL handling                                        */
/* -------------------------------------------------------------------------- */
test("FetchTransport does not prepend baseUrl for absolute request URLs", async () => {
    const baseUrl = "https://jmap.example.com/api";
    const authHeader = "Basic " + Buffer.from("bob:pwd").toString("base64");

    let capturedUrl: string | undefined;

    const stubFetch: typeof fetch = async (input: RequestInfo | URL) => {
        capturedUrl = typeof input === "string" ? input : (input as Request).url;
        return createMockResponse(200, {}, "");
    };

    const transport = new FetchTransport(baseUrl, authHeader, stubFetch);

    const request = new JmapHttpRequest({
        method: "GET",
        url: "https://other.example.com/custom",
    });

    await transport.send(request);
    assert.strictEqual(capturedUrl, "https://other.example.com/custom");
});

/* -------------------------------------------------------------------------- */
/* FetchTransport request without optional fields                              */
/* -------------------------------------------------------------------------- */
test("FetchTransport correctly sends request with default headers and no body", async () => {
    const baseUrl = "https://jmap.example.com/api";
    const authHeader = "Basic " + Buffer.from("carol:pw").toString("base64");

    let capturedInit: RequestInit | undefined;

    const stubFetch: typeof fetch = async (_, init?: RequestInit) => {
        capturedInit = init;
        return createMockResponse(204, {}, "");
    };

    const transport = new FetchTransport(baseUrl, authHeader, stubFetch);

    const request = new JmapHttpRequest({
        method: "GET",
        url: "/no-body",
    });

    await transport.send(request);

    assert.strictEqual(capturedInit?.method, "GET");
    assert.strictEqual(capturedInit?.body, undefined);
    const sentHeaders = capturedInit?.headers as Record<string, string>;
    assert.strictEqual(sentHeaders["Authorization"], authHeader);
});

/* -------------------------------------------------------------------------- */
/* FetchTransport bearer token auth                                            */
/* -------------------------------------------------------------------------- */
test("FetchTransport sends whatever Authorization value it is constructed with (e.g. Bearer)", async () => {
    const baseUrl = "https://jmap.example.com/api";
    const authHeader = "Bearer some-oauth-token";

    let capturedInit: RequestInit | undefined;

    const stubFetch: typeof fetch = async (_, init?: RequestInit) => {
        capturedInit = init;
        return createMockResponse(200, {}, "");
    };

    const transport = new FetchTransport(baseUrl, authHeader, stubFetch);

    const request = new JmapHttpRequest({
        method: "GET",
        url: "/session",
    });

    await transport.send(request);

    const sentHeaders = capturedInit?.headers as Record<string, string>;
    assert.strictEqual(sentHeaders["Authorization"], authHeader);
});

/* -------------------------------------------------------------------------- */
/* FetchTransport network error handling                                       */
/* -------------------------------------------------------------------------- */
test("FetchTransport wraps fetch rejections in JmapNetworkError", async () => {
    const transport = new FetchTransport(
        "https://jmap.example.com/api",
        "Basic dXNlcjpwYXNz",
        async () => {
            throw new Error("network failure");
        },
    );

    const request = new JmapHttpRequest({
        method: "GET",
        url: "/test",
    });

    await assert.rejects(
        async () => {
            await transport.send(request);
        },
        (err: unknown) => {
            assert.ok(err instanceof JmapNetworkError);
            assert.strictEqual((err as JmapNetworkError).message, "network failure");
            return true;
        },
    );
});
