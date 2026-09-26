/**
 * Transport seam for JMAP HTTP communication.
 *
 * Provides low‑level request/response value objects and a default implementation
 * based on the native `fetch` API (or a user‑supplied stub).
 */
import { JmapError, JmapNetworkError, JmapProtocolError } from "./CommonTypes";

/**
 * Minimal HTTP request representation used by the JMAP client core.
 */
export class JmapHttpRequest {
  /** HTTP method, e.g. `"POST"` */
  public readonly method: string;
  /** Full request URL */
  public readonly url: string;
  /** Request headers (case‑preserving) */
  public readonly headers: Record<string, string>;
  /** Optional raw request body bytes. Deliberately a Buffer, not a string: a string body
   *  would force every caller - including blob uploads, which are not text - through a
   *  lossy UTF-8 encode/decode round-trip. JSON method-call bodies are UTF-8-encoded JSON
   *  text (`Buffer.from(json, "utf-8")`); blob uploads are the blob's raw bytes verbatim. */
  public readonly body?: Buffer;

  constructor(params: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: Buffer;
  }) {
    this.method = params.method;
    this.url = params.url;
    this.headers = params.headers ?? {};
    this.body = params.body;
  }
}

/**
 * Minimal HTTP response representation returned by a transport.
 */
export class JmapHttpResponse {
  /** HTTP status code, e.g. `200` */
  public readonly status: number;
  /** Response headers (case‑preserving) */
  public readonly headers: Record<string, string>;
  /** Raw response body bytes (typically JSON text, but a blob download's body is
   *  arbitrary binary data - see the note on {@link JmapHttpRequest.body}). */
  public readonly body: Buffer;

  constructor(params: { status: number; headers: Record<string, string>; body: Buffer }) {
    this.status = params.status;
    this.headers = params.headers;
    this.body = params.body;
  }
}

/**
 * Interface that all transport implementations must satisfy.
 */
export interface JmapTransport {
  /**
   * Sends a low‑level HTTP request and resolves with the corresponding response.
   *
   * @param request The request to send.
   * @returns A promise that resolves to the response.
   * @throws {@link JmapNetworkError} on network‑level failures.
   */
  send(request: JmapHttpRequest): Promise<JmapHttpResponse>;
}

/**
 * Default transport implementation using the native `fetch` API.
 *
 * It attaches the pre-computed `Authorization` header value supplied by the caller on
 * every request. Callers (typically {@link JmapClientCore}) decide once whether that
 * header carries HTTP Basic credentials or an OAuth 2.0 Bearer token (RFC 6750);
 * `FetchTransport` itself is agnostic to the auth scheme. A custom `fetchImpl` can be
 * injected (useful for unit testing).
 */
export class FetchTransport implements JmapTransport {
  private readonly fetchImpl: typeof fetch;

  /**
   * @param baseUrl    Base URL for JMAP API calls (e.g. the `apiUrl` from the session object).
   * @param authHeader Full value of the `Authorization` header to send with every request
   *                    (e.g. `"Basic <base64>"` or `"Bearer <token>"`).
   * @param fetchImpl  Optional custom fetch implementation; defaults to global `fetch`.
   */
  constructor(
    private readonly baseUrl: string,
    private readonly authHeader: string,
    fetchImpl?: typeof fetch,
  ) {
    this.fetchImpl = fetchImpl ?? fetch;
  }

  public async send(request: JmapHttpRequest): Promise<JmapHttpResponse> {
    // Resolve relative URLs against the base URL.
    const url = request.url.startsWith("http")
      ? request.url
      : `${this.baseUrl.replace(/\/+$/, "")}/${request.url.replace(/^\/+/, "")}`;

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      ...request.headers,
    };

    try {
      const response = await this.fetchImpl(url, {
        method: request.method,
        headers,
        // Re-wrapped as a plain Uint8Array: fetch's BodyInit type does not structurally
        // accept Node's branded Buffer<ArrayBufferLike> type directly.
        body: request.body ? new Uint8Array(request.body) : undefined,
      });

      const respBody = Buffer.from(await response.arrayBuffer());

      const respHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        respHeaders[key] = value;
      });

      return new JmapHttpResponse({ status: response.status, headers: respHeaders, body: respBody });
    } catch (err) {
      // Wrap any fetch‑level error in a JmapNetworkError.
      const message =
        err instanceof Error ? err.message : String(err);
      throw new JmapNetworkError(message);
    }
  }
}
