import { JmapProtocolError } from "./CommonTypes";

/**
 * Represents an EmailHeader JMAP data object.
 *
 * @property name - The header name.
 * @property value - The header value.
 */
export class EmailHeader {
  public readonly name: string;
  public readonly value: string;

  /**
   * Constructs a new EmailHeader instance.
   *
   * @param params - Object containing required properties.
   */
  constructor(params: { name: string; value: string }) {
    this.name = params.name;
    this.value = params.value;
  }

  /**
   * Creates an EmailHeader instance from a JSON value.
   *
   * @param data - The unknown JSON data to parse.
   * @returns An EmailHeader instance.
   * @throws JmapProtocolError if the input is not a valid EmailHeader object.
   */
  static fromJson(data: unknown): EmailHeader {
    if (typeof data !== "object" || data === null) {
      throw new JmapProtocolError(
        "InvalidEmailHeader",
        "EmailHeader JSON must be an object"
      );
    }

    const obj = data as Record<string, unknown>;

    if (typeof obj.name !== "string") {
      throw new JmapProtocolError(
        "InvalidEmailHeader",
        "EmailHeader property 'name' must be a string"
      );
    }

    if (typeof obj.value !== "string") {
      throw new JmapProtocolError(
        "InvalidEmailHeader",
        "EmailHeader property 'value' must be a string"
      );
    }

    return new EmailHeader({ name: obj.name, value: obj.value });
  }

  /**
   * Serialises this EmailHeader to a plain JSON object.
   *
   * @returns A JSON representation suitable for JMAP transport.
   */
  toJson(): Record<string, unknown> {
    return {
      name: this.name,
      value: this.value,
    };
  }
}
