/**
 * Highlighted subject/preview snippet for an Email id matched by a filter's text search.
 */
export class SearchSnippet {
    /** Email identifier */
    public readonly emailId: string;
    /** May contain <mark></mark> tags around matches */
    public readonly subject: string | null;
    /** May contain <mark></mark> tags around matches */
    public readonly preview: string | null;

    /**
     * Constructs a new {@link SearchSnippet}.
     * @param data - Fully typed data matching the JMAP wire format.
     */
    public constructor(data: {
        emailId: string;
        subject: string | null;
        preview: string | null;
    }) {
        this.emailId = data.emailId;
        this.subject = data.subject;
        this.preview = data.preview;
    }

    /**
     * Creates a {@link SearchSnippet} instance from an unknown JSON value.
     * @param data - The raw JSON value to parse.
     * @throws {TypeError} If the input does not conform to the expected shape.
     */
    public static fromJson(data: unknown): SearchSnippet {
        if (typeof data !== "object" || data === null) {
            throw new TypeError("SearchSnippet JSON must be an object");
        }

        const obj = data as Record<string, unknown>;

        const emailId = obj["emailId"];
        if (typeof emailId !== "string") {
            throw new TypeError("SearchSnippet.emailId must be a string");
        }

        const subject = obj.hasOwnProperty("subject") ? obj["subject"] : null;
        if (subject !== null && typeof subject !== "string") {
            throw new TypeError("SearchSnippet.subject must be a string or null");
        }

        const preview = obj.hasOwnProperty("preview") ? obj["preview"] : null;
        if (preview !== null && typeof preview !== "string") {
            throw new TypeError("SearchSnippet.preview must be a string or null");
        }

        return new SearchSnippet({
            emailId,
            subject: subject as string | null,
            preview: preview as string | null,
        });
    }

    /**
     * Serialises this {@link SearchSnippet} to a plain JSON object.
     * @returns A JSON‑compatible representation.
     */
    public toJson(): Record<string, unknown> {
        return {
            emailId: this.emailId,
            subject: this.subject,
            preview: this.preview,
        };
    }
}
