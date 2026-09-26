/**
 * Represents a JMAP method invocation tuple `[name, arguments, methodCallId]`.
 *
 * This class is part of the public API because it appears in the `methodCalls`
 * and `methodResponses` arrays of request/response envelopes.
 */
import { JmapProtocolError } from "./CommonTypes";

/**
 * A single JMAP method invocation consisting of a name, arguments, and a client‑chosen methodCallId.
 */
export class Invocation {
  /** The JMAP method name, e.g. `"Mail/get"` */
  public readonly name: string;
  /** The arguments object for the method call */
  public readonly arguments: Record<string, unknown>;
  /** Client‑chosen identifier echoed back in the response */
  public readonly methodCallId: string;

  /**
   * Constructs a new {@link Invocation}.
   *
   * @param init - Object containing the required properties.
   */
  constructor(init: {
    name: string;
    arguments: Record<string, unknown>;
    methodCallId: string;
  }) {
    this.name = init.name;
    this.arguments = init.arguments;
    this.methodCallId = init.methodCallId;
  }

  /**
   * Creates an {@link Invocation} instance from an unknown JSON value.
   *
   * Per RFC 8620 section 3.2, an Invocation is a 3-element JSON ARRAY
   * `[name, arguments, methodCallId]` on the wire, never an object with named keys.
   *
   * @param data - The raw JSON value to parse.
   * @throws {@link JmapProtocolError} if the input does not conform to the expected shape.
   */
  public static fromJson(data: unknown): Invocation {
    if (!Array.isArray(data) || data.length !== 3) {
      throw new JmapProtocolError(
        "invalidInvocation",
        "Invocation JSON must be a 3-element array [name, arguments, methodCallId]"
      );
    }

    const [name, args, methodCallId] = data;

    if (typeof name !== "string") {
      throw new JmapProtocolError(
        "invalidInvocation",
        "Invocation.name must be a string"
      );
    }
    if (typeof args !== "object" || args === null) {
      throw new JmapProtocolError(
        "invalidInvocation",
        "Invocation.arguments must be an object"
      );
    }
    if (typeof methodCallId !== "string") {
      throw new JmapProtocolError(
        "invalidInvocation",
        "Invocation.methodCallId must be a string"
      );
    }

    return new Invocation({
      name,
      arguments: args as Record<string, unknown>,
      methodCallId,
    });
  }

  /**
   * Serialises this {@link Invocation} to its wire-format 3-element JSON array
   * `[name, arguments, methodCallId]` (RFC 8620 section 3.2).
   *
   * @returns A JSON‑compatible array representation of the invocation.
   */
  public toJson(): [string, Record<string, unknown>, string] {
    return [this.name, this.arguments, this.methodCallId];
  }
}
