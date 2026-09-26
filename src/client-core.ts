/**
 * Core JMAP client implementation.
 *
 * Handles session acquisition, authentication header management,
 * generic request sending, and core method wrappers.
 */
import { FetchTransport, JmapTransport, JmapHttpRequest } from "./models/Transport";
import { Invocation } from "./models/Invocation";
import {
  JmapError,
  JmapNetworkError,
  JmapProtocolError,
} from "./models/CommonTypes";
import { JmapRequestEnvelope } from "./models/JmapRequestEnvelope";
import { JmapResponseEnvelope } from "./models/JmapResponseEnvelope";
import { Session } from "./models/Session";

// `Symbol.asyncDispose` is a well-known symbol as of the TC39 Explicit Resource Management
// proposal (TypeScript 5.2+ types it via the "esnext.disposable" lib), but not every Node
// runtime this package might run on defines it natively. Polyfilling it as a registry symbol
// (not a plain `Symbol()`) keeps it consistent across module instances/realms, so `await
// using` still resolves to the exact same symbol used below to define the method.
if (typeof (Symbol as { asyncDispose?: symbol }).asyncDispose === "undefined") {
  (Symbol as { asyncDispose?: symbol }).asyncDispose = Symbol.for("Symbol.asyncDispose");
}

const MAX_ERROR_BODY_EXCERPT = 2000;

/**
 * Builds a non-2xx error message that includes a decoded excerpt of the response body.
 * A real JMAP server's error response commonly carries an RFC 8620 section 3.6.1
 * "problem details" JSON object (type/title/detail) explaining exactly what went wrong -
 * discarding the body entirely throws that information away, leaving only the bare status
 * code to debug from.
 */
function describeHttpError(prefix: string, status: number, body: Buffer): string {
  const text = body.toString("utf-8").trim();
  if (!text) return `${prefix} with status ${status}`;
  const excerpt = text.length > MAX_ERROR_BODY_EXCERPT ? text.slice(0, MAX_ERROR_BODY_EXCERPT) + "..." : text;
  return `${prefix} with status ${status}: ${excerpt}`;
}

/**
 * Options for constructing a {@link JmapClientCore}.
 */
export interface JmapClientOptions {
  /** URL of the JMAP session resource (e.g. `https://host/.well-known/jmap`). */
  sessionUrl: string;
  /** Username for HTTP Basic authentication. Ignored if {@link bearerToken} is set. */
  username: string;
  /** Password for HTTP Basic authentication. Ignored if {@link bearerToken} is set. */
  password: string;
  /**
   * Optional OAuth 2.0 bearer token (RFC 6750). When set (non-empty), the client
   * authenticates with `Authorization: Bearer <token>` instead of HTTP Basic auth,
   * and {@link username}/{@link password} are ignored.
   */
  bearerToken?: string;
  /** Optional custom transport implementation. */
  transport?: JmapTransport;
  /** Optional custom fetch implementation (used by the default transport). */
  fetchImpl?: typeof fetch;
}

/**
 * Base class for the public {@link JmapClient}.
 *
 * Handles session acquisition, authentication header management,
 * generic method invocation, and blob upload/download.
 */
export class JmapClientCore {
  public readonly sessionUrl: string;
  public readonly username: string;
  public readonly password: string;
  public readonly bearerToken?: string;
  public readonly fetchImpl?: typeof fetch;
  public transport: JmapTransport;
  public readonly authHeader: string;
  public session?: Session;
  // Not `protected` - TypeScript's declaration-emit for an exported mixin function's
  // inferred return type (see client-mail.ts / client-submission.ts) cannot describe a
  // protected/private inherited member (TS4094); these stay public but by convention
  // are internal implementation detail, not part of the supported client API surface.
  public callIdCounter = 0;
  public userTransportProvided: boolean;

  /**
   * Constructs a new client core.
   *
   * @param options Configuration options.
   */
  constructor(options: JmapClientOptions) {
    this.sessionUrl = options.sessionUrl;
    this.username = options.username;
    this.password = options.password;
    this.bearerToken = options.bearerToken;
    this.fetchImpl = options.fetchImpl;
    this.authHeader = options.bearerToken
      ? "Bearer " + options.bearerToken
      : "Basic " + Buffer.from(`${this.username}:${this.password}`).toString("base64");

    this.userTransportProvided = !!options.transport;
    this.transport =
      options.transport ?? new FetchTransport(this.sessionUrl, this.authHeader, this.fetchImpl);
  }

  /**
   * Releases any resources held by the client.
   *
   * Currently a no‑op; present for API symmetry.
   */
  public async close(): Promise<void> {
    // No pooled resources in the current implementation.
  }

  /**
   * Implements the `AsyncDisposable` protocol so this class participates in native
   * `await using client = new JmapClient(...)` scoped disposal, matching the RAII-style
   * disposal every other language target in this project provides. Delegates to
   * {@link close}, so subclasses only ever need to override `close`.
   */
  public async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  /**
   * Retrieves the JMAP session object.
   *
   * @returns The parsed {@link Session}.
   * @throws {@link JmapNetworkError} on transport failure.
   * @throws {@link JmapProtocolError} on malformed response.
   */
  public async connect(): Promise<Session> {
    const request = new JmapHttpRequest({
      method: "GET",
      url: this.sessionUrl,
      headers: { Authorization: this.authHeader },
    });

    const response = await this.transport.send(request);
    if (response.status !== 200) {
      throw new JmapNetworkError(describeHttpError("Session request failed", response.status, response.body));
    }

    let json: unknown;
    try {
      json = JSON.parse(response.body.toString("utf-8"));
    } catch {
      throw new JmapProtocolError("invalidSession", "Session response is not valid JSON");
    }

    const rawSession = Session.fromJson(json);

    // The session's apiUrl/uploadUrl/downloadUrl/eventSourceUrl may be relative
    // (valid per RFC 8620) and must be resolved against the session URL's origin.
    // Deliberately NOT `new URL(path, origin)`: uploadUrl/downloadUrl still contain
    // unsubstituted URI-template placeholders like "{accountId}" at this point, and
    // the URL constructor percent-encodes literal `{`/`}`, corrupting the template
    // before uploadBlob/downloadBlob ever get a chance to .replace() it.
    const origin = new URL(this.sessionUrl).origin;
    const resolveUrl = (maybeRelative: string): string => {
      if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
      return maybeRelative.startsWith("/") ? `${origin}${maybeRelative}` : `${origin}/${maybeRelative}`;
    };

    const session = new Session({
      capabilities: rawSession.capabilities,
      accounts: rawSession.accounts,
      primaryAccounts: rawSession.primaryAccounts,
      username: rawSession.username,
      apiUrl: resolveUrl(rawSession.apiUrl),
      downloadUrl: resolveUrl(rawSession.downloadUrl),
      uploadUrl: resolveUrl(rawSession.uploadUrl),
      eventSourceUrl: resolveUrl(rawSession.eventSourceUrl),
      state: rawSession.state,
    });
    this.session = session;

    // If the caller did not supply a transport, replace it with one that uses the API base URL.
    if (!this.userTransportProvided) {
      this.transport = new FetchTransport(session.apiUrl, this.authHeader, this.fetchImpl);
    }

    return session;
  }

  /**
   * Sends a batch of JMAP method calls.
   *
   * @param calls Array of method call descriptors.
   * @param using List of capability URNs required for the calls.
   * @returns The parsed {@link JmapResponseEnvelope}.
   * @throws {@link JmapProtocolError} if any response entry is an error.
   * @throws {@link JmapNetworkError} on transport failure.
   */
  public async sendRequest(
    calls: { name: string; arguments: Record<string, unknown>; methodCallId: string }[],
    using: string[],
  ): Promise<JmapResponseEnvelope> {
    if (!this.session) {
      throw new JmapProtocolError("notConnected", "Client must connect() before sending requests");
    }

    const envelope = new JmapRequestEnvelope({
      using,
      methodCalls: calls.map(
        (c) => new Invocation({ name: c.name, arguments: c.arguments, methodCallId: c.methodCallId })
      ),
      createdIds: null,
    });

    const requestBody = Buffer.from(JSON.stringify(envelope.toJson()), "utf-8");

    const httpRequest = new JmapHttpRequest({
      method: "POST",
      url: this.session.apiUrl,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: requestBody,
    });

    const httpResponse = await this.transport.send(httpRequest);
    if (httpResponse.status !== 200) {
      throw new JmapNetworkError(describeHttpError("JMAP request failed", httpResponse.status, httpResponse.body));
    }

    let respJson: unknown;
    try {
      respJson = JSON.parse(httpResponse.body.toString("utf-8"));
    } catch {
      throw new JmapProtocolError("invalidResponse", "Response body is not valid JSON");
    }

    const envelopeResp = JmapResponseEnvelope.fromJson(respJson);

    // Detect protocol‑level errors.
    for (const inv of envelopeResp.methodResponses) {
      if (inv.name === "error") {
        const args = inv.arguments as Record<string, unknown>;
        const type = typeof args["type"] === "string" ? (args["type"] as string) : "unknown";
        const description =
          typeof args["description"] === "string" ? (args["description"] as string) : "";
        throw new JmapProtocolError(type, description);
      }
    }

    return envelopeResp;
  }

  /**
   * Calls the Core/echo method.
   *
   * @param args Arbitrary arguments to be echoed back.
   * @returns The echoed arguments object.
   */
  public async echo(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const callId = this.nextCallId();
    const respEnvelope = await this.sendRequest(
      [{ name: "Core/echo", arguments: args, methodCallId: callId }],
      ["urn:ietf:params:jmap:core"]
    );

    const response = respEnvelope.methodResponses.find((inv) => inv.methodCallId === callId);
    if (!response) {
      throw new JmapProtocolError("missingResponse", "No response for echo invocation");
    }
    return response.arguments as Record<string, unknown>;
  }

  /**
   * Uploads a blob to the server.
   *
   * @param accountId Identifier of the account owning the blob.
   * @param content   Raw blob content bytes (not a string - blobs are not text, and a
   *                  string parameter would force every caller through a lossy UTF-8
   *                  encode/decode round-trip for real, non-text attachment content).
   * @param contentType MIME type of the blob.
   * @returns Information about the stored blob.
   */
  public async uploadBlob(
    accountId: string,
    content: Buffer,
    contentType: string
  ): Promise<{ accountId: string; blobId: string; type: string; size: number }> {
    if (!this.session) {
      throw new JmapProtocolError("notConnected", "Client must connect() before uploading blobs");
    }

    const baseOrigin = new URL(this.sessionUrl).origin;
    const path = this.session.uploadUrl.replace("{accountId}", encodeURIComponent(accountId));
    const url = new URL(path, baseOrigin).toString();

    const request = new JmapHttpRequest({
      method: "POST",
      url,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": contentType,
      },
      body: content,
    });

    const response = await this.transport.send(request);
    if (response.status !== 200) {
      throw new JmapNetworkError(describeHttpError("Blob upload failed", response.status, response.body));
    }

    let json: unknown;
    try {
      json = JSON.parse(response.body.toString("utf-8"));
    } catch {
      throw new JmapProtocolError("invalidUploadResponse", "Upload response is not valid JSON");
    }

    const obj = json as Record<string, unknown>;
    return {
      accountId: typeof obj["accountId"] === "string" ? (obj["accountId"] as string) : "",
      blobId: typeof obj["blobId"] === "string" ? (obj["blobId"] as string) : "",
      type: typeof obj["type"] === "string" ? (obj["type"] as string) : "",
      size: typeof obj["size"] === "number" ? (obj["size"] as number) : 0,
    };
  }

  /**
   * Downloads a previously uploaded blob.
   *
   * @param accountId Identifier of the owning account.
   * @param blobId    Identifier of the blob to download.
   * @param type      MIME type of the blob.
   * @param name      Optional filename hint.
   * @returns The raw blob content bytes (not a string - see the note on
   *          {@link uploadBlob}'s `content` parameter) and its content type.
   */
  public async downloadBlob(
    accountId: string,
    blobId: string,
    type: string,
    name?: string
  ): Promise<{ content: Buffer; contentType: string }> {
    if (!this.session) {
      throw new JmapProtocolError("notConnected", "Client must connect() before downloading blobs");
    }

    const baseOrigin = new URL(this.sessionUrl).origin;
    let path = this.session.downloadUrl
      .replace("{accountId}", encodeURIComponent(accountId))
      .replace("{blobId}", encodeURIComponent(blobId))
      .replace("{type}", encodeURIComponent(type));

    if (name !== undefined) {
      path = path.replace("{name}", encodeURIComponent(name));
    }

    const url = new URL(path, baseOrigin).toString();

    const request = new JmapHttpRequest({
      method: "GET",
      url,
      headers: { Authorization: this.authHeader },
    });

    const response = await this.transport.send(request);
    if (response.status !== 200) {
      throw new JmapNetworkError(describeHttpError("Blob download failed", response.status, response.body));
    }

    const contentType = response.headers["content-type"] ?? "";
    return { content: response.body, contentType };
  }

  /**
   * Generates a unique method call identifier.
   */
  public nextCallId(): string {
    this.callIdCounter += 1;
    return `c${this.callIdCounter}`;
  }
}
