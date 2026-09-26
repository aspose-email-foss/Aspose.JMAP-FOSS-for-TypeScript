/**
 * Per-recipient delivery outcome, keyed by recipient email address on EmailSubmission.deliveryStatus.
 */
import { JmapProtocolError } from "./CommonTypes";

/**
 * DeliveryStatus model.
 */
export class DeliveryStatus {
    /** SMTP reply string */
    public readonly smtpReply: string;
    /** Delivery status: "queued" | "yes" | "no" | "unknown" */
    public readonly delivered: string;
    /** Display status: "unknown" | "yes" */
    public readonly displayed: string;

    /**
     * @param params Object containing all required properties.
     */
    constructor(params: {
        smtpReply: string;
        delivered: string;
        displayed: string;
    }) {
        this.smtpReply = params.smtpReply;
        this.delivered = params.delivered;
        this.displayed = params.displayed;
    }

    /**
     * Creates a {@link DeliveryStatus} instance from a raw JSON value.
     * @param data Unknown JSON data to parse.
     * @throws {JmapProtocolError} If the data does not conform to the expected shape.
     */
    public static fromJson(data: unknown): DeliveryStatus {
        if (typeof data !== "object" || data === null) {
            throw new JmapProtocolError("Invalid DeliveryStatus JSON: not an object");
        }

        const obj = data as Record<string, unknown>;

        const smtpReply = obj["smtpReply"];
        const delivered = obj["delivered"];
        const displayed = obj["displayed"];

        if (typeof smtpReply !== "string") {
            throw new JmapProtocolError("Invalid DeliveryStatus JSON: smtpReply must be a string");
        }
        if (typeof delivered !== "string") {
            throw new JmapProtocolError("Invalid DeliveryStatus JSON: delivered must be a string");
        }
        if (typeof displayed !== "string") {
            throw new JmapProtocolError("Invalid DeliveryStatus JSON: displayed must be a string");
        }

        return new DeliveryStatus({
            smtpReply,
            delivered,
            displayed,
        });
    }

    /**
     * Serialises this {@link DeliveryStatus} instance to a plain JSON object.
     * @returns A JSON‑compatible representation.
     */
    public toJson(): Record<string, unknown> {
        return {
            smtpReply: this.smtpReply,
            delivered: this.delivered,
            displayed: this.displayed,
        };
    }
}
