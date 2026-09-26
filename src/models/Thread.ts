/**
 * An ordered list of Email ids that make up a conversation.
 */
import { JmapProtocolError } from "./CommonTypes";

/**
 * Represents a JMAP Thread object.
 *
 * The `id` property is server‑assigned and should be omitted when constructing a create payload.
 */
export class Thread {
    /** Server‑assigned identifier (omit when constructing a create payload). */
    public readonly id?: string;
    /** Ordered list of Email ids that belong to this thread. */
    public readonly emailIds: string[];

    /**
     * Constructs a new {@link Thread}.
     *
     * @param params Object containing the thread properties.
     */
    constructor(params: { id?: string; emailIds: string[] }) {
        this.id = params.id;
        this.emailIds = params.emailIds;
    }

    /**
     * Creates a {@link Thread} instance from a raw JSON value.
     *
     * @param data The unknown data to parse.
     * @throws {JmapProtocolError} If the data does not conform to the expected shape.
     */
    public static fromJson(data: unknown): Thread {
        if (typeof data !== "object" || data === null) {
            throw new JmapProtocolError("Invalid Thread data: not an object");
        }

        const obj = data as Record<string, unknown>;

        const emailIdsRaw = obj["emailIds"];
        if (!Array.isArray(emailIdsRaw) || emailIdsRaw.some((v) => typeof v !== "string")) {
            throw new JmapProtocolError("Invalid Thread data: emailIds must be an array of strings");
        }
        const emailIds = emailIdsRaw as string[];

        const idRaw = obj["id"];
        if (idRaw !== undefined && typeof idRaw !== "string") {
            throw new JmapProtocolError("Invalid Thread data: id must be a string if present");
        }
        const id = idRaw as string | undefined;

        return new Thread({ id, emailIds });
    }

    /**
     * Serialises this {@link Thread} to a plain JSON object suitable for transmission.
     *
     * The `id` property is omitted if undefined (e.g., when creating a new thread).
     *
     * @returns A JSON representation of the thread.
     */
    public toJson(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            emailIds: this.emailIds,
        };
        if (this.id !== undefined) {
            json.id = this.id;
        }
        return json;
    }
}
