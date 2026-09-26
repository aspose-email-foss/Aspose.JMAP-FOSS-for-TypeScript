import { DeliveryStatus } from "./DeliveryStatus";
import { Envelope } from "./Envelope";

/**
 * One attempt to submit an Email for delivery. Analogous to what Aspose.Email's SmtpClient.Send does
 * synchronously over SMTP; here creating an EmailSubmission is what actually dispatches the message
 * via the server's outbound MTA.
 */
export class EmailSubmission {
  /** Server-assigned identifier (omit when constructing a create payload). */
  public readonly id?: string;
  /** Must reference an existing Identity. */
  public readonly identityId: string;
  /** The Email to send; typically a draft created via Email/set just before this call. */
  public readonly emailId: string;
  /** Server-assigned thread identifier (omit when constructing a create payload). */
  public readonly threadId?: string;
  /** If null, server derives it from the Email's From/To/Cc/Bcc headers. */
  public readonly envelope?: Envelope | null;
  /** Server-assigned UTCDate string (omit when constructing a create payload). */
  public readonly sendAt?: string;
  /** Server-assigned undo status (omit when constructing a create payload). */
  public readonly undoStatus?: string;
  /** Server-assigned delivery status map (omit when constructing a create payload). */
  public readonly deliveryStatus?: Record<string, DeliveryStatus> | null;
  /** Server-assigned DSN blob identifiers (omit when constructing a create payload). */
  public readonly dsnBlobIds?: string[];
  /** Server-assigned MDN blob identifiers (omit when constructing a create payload). */
  public readonly mdnBlobIds?: string[];

  /**
   * Constructs a new EmailSubmission instance.
   * @param init Object containing the properties for the EmailSubmission.
   */
  constructor(init: {
    id?: string;
    identityId: string;
    emailId: string;
    threadId?: string;
    envelope?: Envelope | null;
    sendAt?: string;
    undoStatus?: string;
    deliveryStatus?: Record<string, DeliveryStatus> | null;
    dsnBlobIds?: string[];
    mdnBlobIds?: string[];
  }) {
    this.id = init.id;
    this.identityId = init.identityId;
    this.emailId = init.emailId;
    this.threadId = init.threadId;
    this.envelope = init.envelope ?? null;
    this.sendAt = init.sendAt;
    this.undoStatus = init.undoStatus;
    this.deliveryStatus = init.deliveryStatus ?? null;
    this.dsnBlobIds = init.dsnBlobIds;
    this.mdnBlobIds = init.mdnBlobIds;
  }

  /**
   * Creates an EmailSubmission instance from a JSON value.
   * @param data Unknown JSON data.
   * @throws TypeError if required fields are missing or have invalid types.
   */
  public static fromJson(data: unknown): EmailSubmission {
    if (typeof data !== "object" || data === null) {
      throw new TypeError("EmailSubmission JSON must be an object");
    }
    const obj = data as Record<string, unknown>;

    const id = typeof obj.id === "string" ? obj.id : undefined;

    if (typeof obj.identityId !== "string") {
      throw new TypeError("EmailSubmission.identityId is required and must be a string");
    }
    const identityId = obj.identityId;

    if (typeof obj.emailId !== "string") {
      throw new TypeError("EmailSubmission.emailId is required and must be a string");
    }
    const emailId = obj.emailId;

    const threadId = typeof obj.threadId === "string" ? obj.threadId : undefined;

    const envelope =
      obj.envelope === null
        ? null
        : obj.envelope !== undefined
        ? Envelope.fromJson(obj.envelope)
        : undefined;

    const sendAt = typeof obj.sendAt === "string" ? obj.sendAt : undefined;
    const undoStatus = typeof obj.undoStatus === "string" ? obj.undoStatus : undefined;

    const deliveryStatus =
      obj.deliveryStatus === null
        ? null
        : typeof obj.deliveryStatus === "object" && obj.deliveryStatus !== null
        ? Object.entries(obj.deliveryStatus as Record<string, unknown>).reduce(
            (acc, [k, v]) => {
              acc[k] = DeliveryStatus.fromJson(v);
              return acc;
            },
            {} as Record<string, DeliveryStatus>,
          )
        : undefined;

    const dsnBlobIds = Array.isArray(obj.dsnBlobIds)
      ? (obj.dsnBlobIds as unknown[]).map((v) => {
          if (typeof v !== "string") {
            throw new TypeError("EmailSubmission.dsnBlobIds must be an array of strings");
          }
          return v;
        })
      : undefined;

    const mdnBlobIds = Array.isArray(obj.mdnBlobIds)
      ? (obj.mdnBlobIds as unknown[]).map((v) => {
          if (typeof v !== "string") {
            throw new TypeError("EmailSubmission.mdnBlobIds must be an array of strings");
          }
          return v;
        })
      : undefined;

    return new EmailSubmission({
      id,
      identityId,
      emailId,
      threadId,
      envelope,
      sendAt,
      undoStatus,
      deliveryStatus,
      dsnBlobIds,
      mdnBlobIds,
    });
  }

  /**
   * Serializes this EmailSubmission to a JSON-compatible plain object.
   */
  public toJson(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (this.id !== undefined) result.id = this.id;
    result.identityId = this.identityId;
    result.emailId = this.emailId;
    if (this.threadId !== undefined) result.threadId = this.threadId;
    if (this.envelope !== undefined) result.envelope = this.envelope ? this.envelope.toJson() : null;
    if (this.sendAt !== undefined) result.sendAt = this.sendAt;
    if (this.undoStatus !== undefined) result.undoStatus = this.undoStatus;
    if (this.deliveryStatus !== undefined) {
      result.deliveryStatus = this.deliveryStatus
        ? Object.entries(this.deliveryStatus).reduce((acc, [k, v]) => {
            acc[k] = v.toJson();
            return acc;
          }, {} as Record<string, unknown>)
        : null;
    }
    if (this.dsnBlobIds !== undefined) result.dsnBlobIds = this.dsnBlobIds;
    if (this.mdnBlobIds !== undefined) result.mdnBlobIds = this.mdnBlobIds;

    return result;
  }
}
