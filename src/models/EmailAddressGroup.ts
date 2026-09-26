/**
 * Group syntax as in From/To headers, e.g. 'Team: a@x, b@x;'.
 */
import { EmailAddress } from "./EmailAddress";

/**
 * Represents a named group of email addresses.
 */
export class EmailAddressGroup {
  /**
   * Group name, or `null` if unnamed.
   */
  public readonly name: string | null;

  /**
   * Array of {@link EmailAddress} objects belonging to the group.
   */
  public readonly addresses: EmailAddress[];

  /**
   * Constructs a new {@link EmailAddressGroup}.
   * @param params Object containing the required properties.
   */
  constructor(params: { name: string | null; addresses: EmailAddress[] }) {
    this.name = params.name;
    this.addresses = params.addresses;
  }

  /**
   * Creates an {@link EmailAddressGroup} instance from a raw JSON value.
   * @param data Unknown JSON data to parse.
   * @throws {@link Error} if the data does not conform to the expected shape.
   */
  public static fromJson(data: unknown): EmailAddressGroup {
    if (typeof data !== "object" || data === null) {
      throw new Error("EmailAddressGroup must be an object");
    }

    const obj = data as Record<string, unknown>;

    if (!("name" in obj)) {
      throw new Error("Missing required property 'name'");
    }
    const nameRaw = obj["name"];
    const name: string | null =
      nameRaw === null
        ? null
        : typeof nameRaw === "string"
        ? nameRaw
        : (() => {
            throw new Error("Property 'name' must be a string or null");
          })();

    if (!("addresses" in obj)) {
      throw new Error("Missing required property 'addresses'");
    }
    const addressesRaw = obj["addresses"];
    if (!Array.isArray(addressesRaw)) {
      throw new Error("Property 'addresses' must be an array");
    }
    const addresses = addressesRaw.map((item, idx) => {
      try {
        return EmailAddress.fromJson(item);
      } catch (e) {
        throw new Error(`Invalid EmailAddress at index ${idx} in 'addresses'`);
      }
    });

    return new EmailAddressGroup({ name, addresses });
  }

  /**
   * Serialises this {@link EmailAddressGroup} to a plain JSON object.
   * @returns A JSON‑compatible representation.
   */
  public toJson(): Record<string, unknown> {
    return {
      name: this.name,
      addresses: this.addresses.map((addr) => addr.toJson()),
    };
  }
}
