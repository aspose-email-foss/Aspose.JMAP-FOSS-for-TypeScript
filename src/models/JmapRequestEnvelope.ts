import { Invocation } from "./Invocation";

/**
 * The JSON body POSTed to Session.apiUrl: { using: [capability URNs], methodCalls: [Invocation, ...], createdIds: {clientId: serverId} | null }.
 */
export class JmapRequestEnvelope {
  /**
   * Capability URNs this request depends on, must include urn:ietf:params:jmap:core.
   */
  public readonly using: string[];
  /**
   * List of method invocations to execute.
   */
  public readonly methodCalls: Invocation[];
  /**
   * Mapping of client‑generated ids to server‑assigned ids, or null if not used.
   */
  public readonly createdIds: Record<string, string> | null;

  /**
   * @param params Object containing required properties.
   */
  constructor(params: {
    using: string[];
    methodCalls: Invocation[];
    createdIds: Record<string, string> | null;
  }) {
    this.using = params.using;
    this.methodCalls = params.methodCalls;
    this.createdIds = params.createdIds;
  }

  /**
   * Creates an instance from a raw JSON value, performing minimal validation.
   * @param data Unknown JSON data.
   * @throws JmapProtocolError if the data does not conform to the expected shape.
   */
  public static fromJson(data: unknown): JmapRequestEnvelope {
    if (typeof data !== "object" || data === null) {
      throw new Error("Invalid JmapRequestEnvelope: not an object");
    }
    const obj = data as Record<string, unknown>;

    // using
    if (!Array.isArray(obj.using) || !obj.using.every((v) => typeof v === "string")) {
      throw new Error("Invalid JmapRequestEnvelope: 'using' must be an array of strings");
    }
    const using = obj.using as string[];

    // methodCalls
    if (!Array.isArray(obj.methodCalls)) {
      throw new Error("Invalid JmapRequestEnvelope: 'methodCalls' must be an array");
    }
    const methodCalls = obj.methodCalls.map((item) => Invocation.fromJson(item));

    // createdIds
    let createdIds: Record<string, string> | null = null;
    if (obj.createdIds !== null && obj.createdIds !== undefined) {
      if (typeof obj.createdIds !== "object" || obj.createdIds === null) {
        throw new Error("Invalid JmapRequestEnvelope: 'createdIds' must be an object or null");
      }
      const map = obj.createdIds as Record<string, unknown>;
      createdIds = {};
      for (const [k, v] of Object.entries(map)) {
        if (typeof v !== "string") {
          throw new Error(`Invalid JmapRequestEnvelope: createdIds value for key '${k}' must be a string`);
        }
        createdIds[k] = v;
      }
    }

    return new JmapRequestEnvelope({ using, methodCalls, createdIds });
  }

  /**
   * Serialises this envelope to a plain JSON object suitable for transmission.
   */
  public toJson(): Record<string, unknown> {
    return {
      using: this.using,
      methodCalls: this.methodCalls.map((c) => c.toJson()),
      createdIds: this.createdIds,
    };
  }
}
