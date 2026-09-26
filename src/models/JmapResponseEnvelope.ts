/**
 * The JSON body returned from the JMAP API URL.
 *
 * This envelope wraps the method responses returned by the server.
 * It is deliberately not named simply "Response" to avoid confusion
 * with {@link JmapRequestEnvelope}.
 */
import { Invocation } from "./Invocation";
import { JmapProtocolError } from "./CommonTypes";

/**
 * Represents a JMAP response envelope.
 */
export class JmapResponseEnvelope {
  /** The list of method responses. */
  public readonly methodResponses: Invocation[];
  /** Mapping of client‑generated IDs to server‑generated IDs, or null if omitted. */
  public readonly createdIds: Record<string, string> | null;
  /** The current session state. */
  public readonly sessionState: string;

  /**
   * Constructs a new {@link JmapResponseEnvelope}.
   *
   * @param params Object containing the envelope properties.
   */
  public constructor(params: {
    methodResponses: Invocation[];
    createdIds?: Record<string, string> | null;
    sessionState: string;
  }) {
    this.methodResponses = params.methodResponses;
    this.createdIds = params.createdIds ?? null;
    this.sessionState = params.sessionState;
  }

  /**
   * Creates a {@link JmapResponseEnvelope} from an unknown JSON value.
   *
   * @param data The raw JSON data.
   * @throws {@link JmapProtocolError} if the data does not conform to the expected shape.
   */
  public static fromJson(data: unknown): JmapResponseEnvelope {
    if (typeof data !== "object" || data === null) {
      throw new JmapProtocolError("Invalid response envelope: not an object");
    }

    const obj = data as Record<string, unknown>;

    // methodResponses (required)
    if (!Array.isArray(obj.methodResponses)) {
      throw new JmapProtocolError(
        "Invalid response envelope: missing or invalid 'methodResponses'"
      );
    }
    const methodResponses = obj.methodResponses.map((item, index) => {
      try {
        return Invocation.fromJson(item);
      } catch (e) {
        throw new JmapProtocolError(
          `Invalid method response at index ${index}: ${(e as Error).message}`
        );
      }
    });

    // sessionState (required)
    if (typeof obj.sessionState !== "string") {
      throw new JmapProtocolError(
        "Invalid response envelope: missing or invalid 'sessionState'"
      );
    }
    const sessionState = obj.sessionState;

    // createdIds (optional, may be null)
    let createdIds: Record<string, string> | null = null;
    if ("createdIds" in obj) {
      const raw = obj.createdIds;
      if (raw === null) {
        createdIds = null;
      } else if (typeof raw === "object" && raw !== null) {
        const map = raw as Record<string, unknown>;
        createdIds = {};
        for (const [k, v] of Object.entries(map)) {
          if (typeof v !== "string") {
            throw new JmapProtocolError(
              `Invalid createdIds entry for key '${k}': expected string ID`
            );
          }
          createdIds[k] = v;
        }
      } else {
        throw new JmapProtocolError(
          "Invalid response envelope: 'createdIds' must be an object or null"
        );
      }
    }

    return new JmapResponseEnvelope({
      methodResponses,
      createdIds,
      sessionState,
    });
  }

  /**
   * Serialises this envelope to a plain JSON object.
   *
   * @returns A JSON‑compatible representation of the envelope.
   */
  public toJson(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      methodResponses: this.methodResponses.map((mr) => mr.toJson()),
      sessionState: this.sessionState,
    };
    if (this.createdIds !== null) {
      json.createdIds = this.createdIds;
    } else {
      json.createdIds = null;
    }
    return json;
  }
}
