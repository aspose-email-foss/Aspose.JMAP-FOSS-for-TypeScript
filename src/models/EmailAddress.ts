/**
 * One address in a header such as From/To/Cc (RFC 8621 section 4.1.2.3).
 */
export class EmailAddress {
    /** The display name of the address, or `null` if not provided. */
    public readonly name: string | null;
    /** The email address (required). */
    public readonly email: string;

    /**
     * Constructs a new {@link EmailAddress}.
     * @param params Object containing the required properties.
     */
    public constructor(params: { name: string | null; email: string }) {
        this.name = params.name;
        this.email = params.email;
    }

    /**
     * Creates an {@link EmailAddress} instance from a JSON value.
     * @param data The unknown JSON data to parse.
     * @returns An {@link EmailAddress} instance.
     * @throws {TypeError} If the input does not conform to the expected shape.
     */
    public static fromJson(data: unknown): EmailAddress {
        if (typeof data !== "object" || data === null) {
            throw new TypeError("EmailAddress JSON must be an object");
        }

        const obj = data as Record<string, unknown>;

        const email = obj["email"];
        if (typeof email !== "string") {
            throw new TypeError("EmailAddress.email must be a string");
        }

        const nameRaw = obj.hasOwnProperty("name") ? obj["name"] : null;
        if (nameRaw !== null && typeof nameRaw !== "string") {
            throw new TypeError("EmailAddress.name must be a string or null");
        }

        return new EmailAddress({
            name: nameRaw as string | null,
            email: email,
        });
    }

    /**
     * Serialises this {@link EmailAddress} to a plain JSON object.
     * @returns A JSON representation suitable for JMAP transport.
     */
    public toJson(): Record<string, unknown> {
        return {
            name: this.name,
            email: this.email,
        };
    }
}
