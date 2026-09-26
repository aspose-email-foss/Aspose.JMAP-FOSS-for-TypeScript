/**
 * SMTP MAIL FROM / RCPT TO envelope for a submission, distinct from the message's own From/To headers.
 */
import { JmapProtocolError } from "./CommonTypes";

/**
 * SMTP envelope used in a submission.
 */
export class Envelope {
  /** SMTP MAIL FROM address */
  public readonly mailFrom: Address;
  /** SMTP RCPT TO addresses */
  public readonly rcptTo: Address[];

  /**
   * @param data - Fully typed constructor argument.
   */
  public constructor(data: { mailFrom: Address; rcptTo: Address[] }) {
    this.mailFrom = data.mailFrom;
    this.rcptTo = data.rcptTo;
  }

  /**
   * Creates an {@link Envelope} instance from an unknown JSON value.
   * @param data - The JSON value to parse.
   * @throws {JmapProtocolError} If the JSON does not conform to the expected shape.
   */
  public static fromJson(data: unknown): Envelope {
    if (typeof data !== "object" || data === null) {
      throw new JmapProtocolError("InvalidEnvelope", "Envelope must be an object");
    }
    const obj = data as Record<string, unknown>;

    if (!("mailFrom" in obj)) {
      throw new JmapProtocolError("MissingProperty", "Envelope.mailFrom is required");
    }
    if (!("rcptTo" in obj)) {
      throw new JmapProtocolError("MissingProperty", "Envelope.rcptTo is required");
    }

    const mailFrom = Address.fromJson(obj["mailFrom"]);
    const rcptRaw = obj["rcptTo"];
    if (!Array.isArray(rcptRaw)) {
      throw new JmapProtocolError("InvalidProperty", "Envelope.rcptTo must be an array");
    }
    const rcptTo = rcptRaw.map((item, idx) => {
      try {
        return Address.fromJson(item);
      } catch (e) {
        throw new JmapProtocolError(
          "InvalidArrayItem",
          `Envelope.rcptTo[${idx}] is invalid: ${(e as Error).message}`
        );
      }
    });

    return new Envelope({ mailFrom, rcptTo });
  }

  /**
   * Serialises this {@link Envelope} to a plain JSON object suitable for transmission.
   */
  public toJson(): Record<string, unknown> {
    return {
      mailFrom: this.mailFrom.toJson(),
      rcptTo: this.rcptTo.map((addr) => addr.toJson()),
    };
  }
}

/**
 * SMTP address used in MAIL FROM / RCPT TO commands.
 *
 * `parameters` are SMTP MAIL/RCPT parameters, e.g. {"RET": "HDRS"}.
 */
export class Address {
  /** Email address string */
  public readonly email: string;
  /** Optional SMTP parameters */
  public readonly parameters: Record<string, string | null> | null;

  /**
   * @param data - Fully typed constructor argument.
   */
  public constructor(data: {
    email: string;
    parameters?: Record<string, string | null> | null;
  }) {
    this.email = data.email;
    this.parameters = data.parameters ?? null;
  }

  /**
   * Creates an {@link Address} instance from an unknown JSON value.
   * @param data - The JSON value to parse.
   * @throws {JmapProtocolError} If the JSON does not conform to the expected shape.
   */
  public static fromJson(data: unknown): Address {
    if (typeof data !== "object" || data === null) {
      throw new JmapProtocolError("InvalidAddress", "Address must be an object");
    }
    const obj = data as Record<string, unknown>;

    if (typeof obj["email"] !== "string") {
      throw new JmapProtocolError(
        "MissingOrInvalidProperty",
        "Address.email must be a string"
      );
    }
    const email = obj["email"] as string;

    let parameters: Record<string, string | null> | null = null;
    if ("parameters" in obj) {
      const rawParams = obj["parameters"];
      if (rawParams === null) {
        parameters = null;
      } else if (typeof rawParams === "object") {
        parameters = {};
        for (const [key, value] of Object.entries(rawParams)) {
          if (value === null) {
            parameters[key] = null;
          } else if (typeof value === "string") {
            parameters[key] = value;
          } else {
            throw new JmapProtocolError(
              "InvalidProperty",
              `Address.parameters[${key}] must be string or null`
            );
          }
        }
      } else {
        throw new JmapProtocolError(
          "InvalidProperty",
          "Address.parameters must be an object or null"
        );
      }
    }

    return new Address({ email, parameters });
  }

  /**
   * Serialises this {@link Address} to a plain JSON object suitable for transmission.
   */
  public toJson(): Record<string, unknown> {
    return {
      email: this.email,
      parameters: this.parameters,
    };
  }
}
