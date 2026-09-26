import { EmailAddress } from "./EmailAddress";
import { JmapProtocolError } from "./CommonTypes";

/**
 * A sending identity (name/email/replyTo used as the From when submitting mail);
 * analogous to configuring a MailAddress + display name on Aspose's SmtpClient.
 */
export class Identity {
  /** Server-assigned identifier (omit when constructing a create payload). */
  public readonly id?: string;
  /** Display name (default: empty string). */
  public readonly name: string;
  /** Email address (required). */
  public readonly email: string;
  /** Reply‑To addresses (null if not set). */
  public readonly replyTo: EmailAddress[] | null;
  /** BCC addresses (null if not set). */
  public readonly bcc: EmailAddress[] | null;
  /** Text signature (default: empty string). */
  public readonly textSignature: string;
  /** HTML signature (default: empty string). */
  public readonly htmlSignature: string;
  /** Server-assigned flag indicating whether the identity may be deleted (omit when creating). */
  public readonly mayDelete?: boolean;

  /**
   * Constructs a new {@link Identity}.
   * @param params Object containing identity properties.
   */
  constructor(params: {
    id?: string;
    name?: string;
    email: string;
    replyTo?: EmailAddress[] | null;
    bcc?: EmailAddress[] | null;
    textSignature?: string;
    htmlSignature?: string;
    mayDelete?: boolean;
  }) {
    this.id = params.id;
    this.name = params.name ?? "";
    this.email = params.email;
    this.replyTo = params.replyTo ?? null;
    this.bcc = params.bcc ?? null;
    this.textSignature = params.textSignature ?? "";
    this.htmlSignature = params.htmlSignature ?? "";
    this.mayDelete = params.mayDelete;
  }

  /**
   * Creates an {@link Identity} instance from a raw JSON value.
   * @param data Unknown JSON data.
   * @throws {@link JmapProtocolError} if the data does not conform to the expected shape.
   */
  public static fromJson(data: unknown): Identity {
    if (typeof data !== "object" || data === null) {
      throw new JmapProtocolError("InvalidIdentity", "Identity JSON is not an object");
    }
    const obj = data as Record<string, unknown>;

    const id = typeof obj.id === "string" ? obj.id : undefined;
    const name = typeof obj.name === "string" ? obj.name : "";
    if (typeof obj.email !== "string") {
      throw new JmapProtocolError("InvalidIdentity", "email is required and must be a string");
    }
    const email = obj.email as string;

    const parseEmailArray = (value: unknown, field: string): EmailAddress[] | null => {
      if (value === null || value === undefined) return null;
      if (!Array.isArray(value)) {
        throw new JmapProtocolError("InvalidIdentity", `${field} must be an array or null`);
      }
      return value.map((item) => EmailAddress.fromJson(item));
    };

    const replyTo = parseEmailArray(obj.replyTo, "replyTo");
    const bcc = parseEmailArray(obj.bcc, "bcc");

    const textSignature = typeof obj.textSignature === "string" ? obj.textSignature : "";
    const htmlSignature = typeof obj.htmlSignature === "string" ? obj.htmlSignature : "";
    const mayDelete = typeof obj.mayDelete === "boolean" ? obj.mayDelete : undefined;

    return new Identity({
      id,
      name,
      email,
      replyTo,
      bcc,
      textSignature,
      htmlSignature,
      mayDelete,
    });
  }

  /**
   * Serialises this {@link Identity} to a plain JSON object suitable for JMAP transport.
   */
  public toJson(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (this.id !== undefined) result.id = this.id;
    result.name = this.name;
    result.email = this.email;
    result.replyTo = this.replyTo !== null ? this.replyTo.map((a) => a.toJson()) : null;
    result.bcc = this.bcc !== null ? this.bcc.map((a) => a.toJson()) : null;
    result.textSignature = this.textSignature;
    result.htmlSignature = this.htmlSignature;
    if (this.mayDelete !== undefined) result.mayDelete = this.mayDelete;

    return result;
  }
}
