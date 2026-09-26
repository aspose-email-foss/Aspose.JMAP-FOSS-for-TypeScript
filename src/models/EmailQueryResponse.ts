/**
 * Result of an `Email/query` call (RFC 8620 section 5.5).
 */
import { JmapProtocolError } from "./CommonTypes";

/**
 * EmailQueryResponse model.
 *
 * @property accountId - The id of the account used for the call.
 * @property queryState - A string encoding the current state of the query results.
 * @property canCalculateChanges - Whether the server can calculate changes via `Email/queryChanges`.
 * @property position - The zero‑based index of the first result in `ids` within the full result set.
 * @property ids - The list of ids matching the query, in the requested sort order.
 * @property total - The total number of matching results, or `null` if not calculated.
 * @property limit - The limit enforced by the server on this call, or `null` if none was applied.
 */
export class EmailQueryResponse {
  public readonly accountId: string;
  public readonly queryState: string;
  public readonly canCalculateChanges: boolean;
  public readonly position: number;
  public readonly ids: string[];
  public readonly total: number | null;
  public readonly limit: number | null;

  /**
   * Constructs a new {@link EmailQueryResponse}.
   *
   * @param data - Fully typed data for the response.
   */
  constructor(data: {
    accountId: string;
    queryState: string;
    canCalculateChanges: boolean;
    position: number;
    ids: string[];
    total?: number | null;
    limit?: number | null;
  }) {
    this.accountId = data.accountId;
    this.queryState = data.queryState;
    this.canCalculateChanges = data.canCalculateChanges;
    this.position = data.position;
    this.ids = data.ids;
    this.total = data.total ?? null;
    this.limit = data.limit ?? null;
  }

  /**
   * Creates an {@link EmailQueryResponse} instance from a raw JSON value.
   *
   * @param data - Unknown JSON data to parse.
   * @throws {@link JmapProtocolError} if the input does not conform to the expected shape.
   */
  public static fromJson(data: unknown): EmailQueryResponse {
    if (typeof data !== "object" || data === null) {
      throw new JmapProtocolError("invalidArguments", "EmailQueryResponse JSON must be an object");
    }

    const obj = data as Record<string, unknown>;

    const accountId = obj["accountId"];
    if (typeof accountId !== "string") {
      throw new JmapProtocolError("invalidArguments", "EmailQueryResponse.accountId must be a string");
    }

    const queryState = obj["queryState"];
    if (typeof queryState !== "string") {
      throw new JmapProtocolError("invalidArguments", "EmailQueryResponse.queryState must be a string");
    }

    const canCalculateChanges = obj["canCalculateChanges"];
    if (typeof canCalculateChanges !== "boolean") {
      throw new JmapProtocolError(
        "invalidArguments",
        "EmailQueryResponse.canCalculateChanges must be a boolean",
      );
    }

    const position = obj["position"];
    if (typeof position !== "number" || !Number.isInteger(position) || position < 0) {
      throw new JmapProtocolError(
        "invalidArguments",
        "EmailQueryResponse.position must be a non-negative integer",
      );
    }

    const idsRaw = obj["ids"];
    if (!Array.isArray(idsRaw) || !idsRaw.every((id) => typeof id === "string")) {
      throw new JmapProtocolError("invalidArguments", "EmailQueryResponse.ids must be an array of strings");
    }
    const ids = idsRaw as string[];

    const totalRaw = obj["total"];
    let total: number | null = null;
    if (totalRaw !== undefined && totalRaw !== null) {
      if (typeof totalRaw !== "number" || !Number.isInteger(totalRaw) || totalRaw < 0) {
        throw new JmapProtocolError(
          "invalidArguments",
          "EmailQueryResponse.total must be a non-negative integer or null",
        );
      }
      total = totalRaw;
    }

    const limitRaw = obj["limit"];
    let limit: number | null = null;
    if (limitRaw !== undefined && limitRaw !== null) {
      if (typeof limitRaw !== "number" || !Number.isInteger(limitRaw) || limitRaw < 0) {
        throw new JmapProtocolError(
          "invalidArguments",
          "EmailQueryResponse.limit must be a non-negative integer or null",
        );
      }
      limit = limitRaw;
    }

    return new EmailQueryResponse({
      accountId,
      queryState,
      canCalculateChanges,
      position,
      ids,
      total,
      limit,
    });
  }

  /**
   * Serialises this {@link EmailQueryResponse} to a plain JSON object.
   *
   * @returns A JSON representation of the response.
   */
  public toJson(): Record<string, unknown> {
    return {
      accountId: this.accountId,
      queryState: this.queryState,
      canCalculateChanges: this.canCalculateChanges,
      position: this.position,
      ids: this.ids,
      total: this.total,
      limit: this.limit,
    };
  }
}
