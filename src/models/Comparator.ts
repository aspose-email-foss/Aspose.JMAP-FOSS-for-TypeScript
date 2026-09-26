/**
 * One entry of an Email/query `sort` argument.
 */
import { JmapProtocolError } from "./CommonTypes";

/**
 * Comparator model.
 *
 * @property property - The name of the property to sort by (e.g. `receivedAt`, `from`, `subject`, `size`).
 * @property isAscending - Sort direction; defaults to `true` (ascending).
 * @property collation - Optional collation identifier, or `null` if not applicable.
 */
export class Comparator {
  public readonly property: string;
  public readonly isAscending: boolean;
  public readonly collation: string | null;

  /**
   * Constructs a new {@link Comparator}.
   *
   * @param data - Fully typed data for the comparator.
   */
  constructor(data: {
    property: string;
    isAscending?: boolean;
    collation?: string | null;
  }) {
    this.property = data.property;
    this.isAscending = data.isAscending ?? true;
    this.collation = data.collation ?? null;
  }

  /**
   * Creates a {@link Comparator} instance from a raw JSON value.
   *
   * @param data - Unknown JSON data to parse.
   * @throws {@link JmapProtocolError} if the input does not conform to the expected shape.
   */
  public static fromJson(data: unknown): Comparator {
    if (typeof data !== "object" || data === null) {
      throw new JmapProtocolError("Comparator JSON must be an object");
    }

    const obj = data as Record<string, unknown>;

    const property = obj["property"];
    if (typeof property !== "string") {
      throw new JmapProtocolError("Comparator.property must be a string");
    }

    const isAscendingRaw = obj["isAscending"];
    let isAscending: boolean | undefined;
    if (isAscendingRaw !== undefined) {
      if (typeof isAscendingRaw !== "boolean") {
        throw new JmapProtocolError("Comparator.isAscending must be a boolean");
      }
      isAscending = isAscendingRaw;
    }

    const collationRaw = obj["collation"];
    let collation: string | null | undefined;
    if (collationRaw !== undefined) {
      if (collationRaw !== null && typeof collationRaw !== "string") {
        throw new JmapProtocolError("Comparator.collation must be a string or null");
      }
      collation = collationRaw as string | null;
    }

    return new Comparator({
      property,
      isAscending,
      collation,
    });
  }

  /**
   * Serialises this {@link Comparator} to a plain JSON object suitable for JMAP transport.
   *
   * @returns A JSON representation of the comparator.
   */
  public toJson(): Record<string, unknown> {
    return {
      property: this.property,
      isAscending: this.isAscending,
      collation: this.collation,
    };
  }
}
