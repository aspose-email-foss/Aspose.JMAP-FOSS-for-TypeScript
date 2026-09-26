import { EmailAddress } from "./EmailAddress";
import { EmailBodyPart } from "./EmailBodyPart";

/**
 * Represents the value of an email body part.
 *
 * Properties:
 * - value: string
 * - isEncodingProblem: boolean
 * - isTruncated: boolean
 */
export class EmailBodyValue {
  public readonly value: string;
  public readonly isEncodingProblem: boolean;
  public readonly isTruncated: boolean;

  public constructor(init: {
    value: string;
    isEncodingProblem: boolean;
    isTruncated: boolean;
  }) {
    this.value = init.value;
    this.isEncodingProblem = init.isEncodingProblem;
    this.isTruncated = init.isTruncated;
  }

  /**
   * Creates an {@link EmailBodyValue} from a raw JSON value.
   * @param data Unknown JSON data.
   * @throws {Error} If the data does not conform to the expected shape.
   */
  public static fromJson(data: unknown): EmailBodyValue {
    if (typeof data !== "object" || data === null) {
      throw new Error("EmailBodyValue must be an object");
    }
    const obj = data as Record<string, unknown>;

    const value = typeof obj["value"] === "string" ? obj["value"] : (() => {
      throw new Error("EmailBodyValue.value must be a string");
    })();

    const isEncodingProblem = typeof obj["isEncodingProblem"] === "boolean"
      ? obj["isEncodingProblem"]
      : (() => {
        throw new Error("EmailBodyValue.isEncodingProblem must be a boolean");
      })();

    const isTruncated = typeof obj["isTruncated"] === "boolean"
      ? obj["isTruncated"]
      : (() => {
        throw new Error("EmailBodyValue.isTruncated must be a boolean");
      })();

    return new EmailBodyValue({ value, isEncodingProblem, isTruncated });
  }

  /**
   * Serialises this {@link EmailBodyValue} to a plain JSON object.
   */
  public toJson(): Record<string, unknown> {
    return {
      value: this.value,
      isEncodingProblem: this.isEncodingProblem,
      isTruncated: this.isTruncated,
    };
  }
}

/**
 * A single email message (RFC 8621 "Email" object). Immutable content (headers, body)
 * plus mutable per‑mailbox metadata (mailboxIds, keywords).
 */
export class Email {
  public readonly id?: string;
  public readonly blobId?: string;
  public readonly threadId?: string;
  public readonly mailboxIds: Record<string, boolean>;
  public readonly keywords: Record<string, boolean>;
  public readonly size?: number;
  public readonly receivedAt?: string;
  public readonly messageId?: string[] | null;
  public readonly inReplyTo?: string[] | null;
  public readonly references?: string[] | null;
  public readonly sender?: EmailAddress[] | null;
  public readonly from?: EmailAddress[] | null;
  public readonly to?: EmailAddress[] | null;
  public readonly cc?: EmailAddress[] | null;
  public readonly bcc?: EmailAddress[] | null;
  public readonly replyTo?: EmailAddress[] | null;
  public readonly subject?: string | null;
  public readonly sentAt?: string | null;
  public readonly bodyStructure?: EmailBodyPart;
  public readonly bodyValues?: Record<string, EmailBodyValue>;
  public readonly textBody?: EmailBodyPart[];
  public readonly htmlBody?: EmailBodyPart[];
  public readonly attachments?: EmailBodyPart[];
  public readonly hasAttachment?: boolean;
  public readonly preview?: string;

  public constructor(init: {
    id?: string;
    blobId?: string;
    threadId?: string;
    mailboxIds: Record<string, boolean>;
    keywords?: Record<string, boolean>;
    size?: number;
    receivedAt?: string;
    messageId?: string[] | null;
    inReplyTo?: string[] | null;
    references?: string[] | null;
    sender?: EmailAddress[] | null;
    from?: EmailAddress[] | null;
    to?: EmailAddress[] | null;
    cc?: EmailAddress[] | null;
    bcc?: EmailAddress[] | null;
    replyTo?: EmailAddress[] | null;
    subject?: string | null;
    sentAt?: string | null;
    bodyStructure?: EmailBodyPart;
    bodyValues?: Record<string, EmailBodyValue>;
    textBody?: EmailBodyPart[];
    htmlBody?: EmailBodyPart[];
    attachments?: EmailBodyPart[];
    hasAttachment?: boolean;
    preview?: string;
  }) {
    this.id = init.id;
    this.blobId = init.blobId;
    this.threadId = init.threadId;
    this.mailboxIds = init.mailboxIds;
    this.keywords = init.keywords ?? {};
    this.size = init.size;
    this.receivedAt = init.receivedAt;
    this.messageId = init.messageId;
    this.inReplyTo = init.inReplyTo;
    this.references = init.references;
    this.sender = init.sender;
    this.from = init.from;
    this.to = init.to;
    this.cc = init.cc;
    this.bcc = init.bcc;
    this.replyTo = init.replyTo;
    this.subject = init.subject;
    this.sentAt = init.sentAt;
    this.bodyStructure = init.bodyStructure;
    this.bodyValues = init.bodyValues;
    this.textBody = init.textBody;
    this.htmlBody = init.htmlBody;
    this.attachments = init.attachments;
    this.hasAttachment = init.hasAttachment;
    this.preview = init.preview;
  }

  /**
   * Creates an {@link Email} instance from a raw JSON value.
   * @param data Unknown JSON data.
   * @throws {Error} If the data does not conform to the expected shape.
   */
  public static fromJson(data: unknown): Email {
    if (typeof data !== "object" || data === null) {
      throw new Error("Email must be an object");
    }
    const obj = data as Record<string, unknown>;

    const id = typeof obj["id"] === "string" ? obj["id"] : undefined;
    const blobId = typeof obj["blobId"] === "string" ? obj["blobId"] : undefined;
    const threadId = typeof obj["threadId"] === "string" ? obj["threadId"] : undefined;

    // mailboxIds is required
    const mailboxIdsRaw = obj["mailboxIds"];
    if (typeof mailboxIdsRaw !== "object" || mailboxIdsRaw === null) {
      throw new Error("Email.mailboxIds must be an object");
    }
    const mailboxIds: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(mailboxIdsRaw)) {
      if (typeof v !== "boolean") {
        throw new Error(`Email.mailboxIds[${k}] must be a boolean`);
      }
      mailboxIds[k] = v;
    }

    const keywordsRaw = obj["keywords"];
    const keywords: Record<string, boolean> = {};
    if (typeof keywordsRaw === "object" && keywordsRaw !== null) {
      for (const [k, v] of Object.entries(keywordsRaw)) {
        if (typeof v !== "boolean") {
          throw new Error(`Email.keywords[${k}] must be a boolean`);
        }
        keywords[k] = v;
      }
    }

    const size = typeof obj["size"] === "number" ? obj["size"] : undefined;
    const receivedAt = typeof obj["receivedAt"] === "string" ? obj["receivedAt"] : undefined;

    // These string-array fields are absent-vs-null-vs-present: an absent key must stay
    // `undefined` (so toJson can omit it, per model_conventions), while an explicit JSON
    // `null` must stay `null` (so toJson round-trips it) - do not collapse the two.
    const parseStringArray = (field: unknown, label: string): string[] | null | undefined => {
      if (field === undefined) return undefined;
      if (field === null) return null;
      if (!Array.isArray(field)) {
        throw new Error(`Email.${label} must be an array or null`);
      }
      return field.map(v => {
        if (typeof v !== "string") {
          throw new Error(`Email.${label} array elements must be strings`);
        }
        return v;
      });
    };

    const messageId = parseStringArray(obj["messageId"], "messageId");
    const inReplyTo = parseStringArray(obj["inReplyTo"], "inReplyTo");
    const references = parseStringArray(obj["references"], "references");

    const parseEmailAddressArray = (field: unknown): EmailAddress[] | null | undefined => {
      if (field === undefined) return undefined;
      if (field === null) return null;
      if (!Array.isArray(field)) {
        throw new Error("Expected an array of EmailAddress objects");
      }
      return field.map(item => EmailAddress.fromJson(item));
    };

    const sender = parseEmailAddressArray(obj["sender"]);
    const from = parseEmailAddressArray(obj["from"]);
    const to = parseEmailAddressArray(obj["to"]);
    const cc = parseEmailAddressArray(obj["cc"]);
    const bcc = parseEmailAddressArray(obj["bcc"]);
    const replyTo = parseEmailAddressArray(obj["replyTo"]);

    const parseNullableString = (field: unknown): string | null | undefined => {
      if (field === undefined) return undefined;
      if (field === null) return null;
      if (typeof field !== "string") {
        throw new Error("expected a string or null");
      }
      return field;
    };
    const subject = parseNullableString(obj["subject"]);
    const sentAt = parseNullableString(obj["sentAt"]);

    const bodyStructure = obj["bodyStructure"]
      ? EmailBodyPart.fromJson(obj["bodyStructure"])
      : undefined;

    const bodyValuesRaw = obj["bodyValues"];
    let bodyValues: Record<string, EmailBodyValue> | undefined;
    if (typeof bodyValuesRaw === "object" && bodyValuesRaw !== null) {
      bodyValues = {};
      for (const [k, v] of Object.entries(bodyValuesRaw)) {
        bodyValues[k] = EmailBodyValue.fromJson(v);
      }
    }

    const parseBodyPartArray = (field: unknown): EmailBodyPart[] | undefined => {
      if (field === undefined) return undefined;
      if (!Array.isArray(field)) {
        throw new Error("Expected an array of EmailBodyPart objects");
      }
      return field.map(item => EmailBodyPart.fromJson(item));
    };

    const textBody = parseBodyPartArray(obj["textBody"]);
    const htmlBody = parseBodyPartArray(obj["htmlBody"]);
    const attachments = parseBodyPartArray(obj["attachments"]);

    const hasAttachment = typeof obj["hasAttachment"] === "boolean" ? obj["hasAttachment"] : undefined;
    const preview = typeof obj["preview"] === "string" ? obj["preview"] : undefined;

    return new Email({
      id,
      blobId,
      threadId,
      mailboxIds,
      keywords,
      size,
      receivedAt,
      messageId,
      inReplyTo,
      references,
      sender,
      from,
      to,
      cc,
      bcc,
      replyTo,
      subject,
      sentAt,
      bodyStructure,
      bodyValues,
      textBody,
      htmlBody,
      attachments,
      hasAttachment,
      preview,
    });
  }

  /**
   * Serialises this {@link Email} to a plain JSON object.
   * Undefined properties are omitted.
   */
  public toJson(): Record<string, unknown> {
    const out: Record<string, unknown> = {
      mailboxIds: this.mailboxIds,
    };

    if (this.id !== undefined) out["id"] = this.id;
    if (this.blobId !== undefined) out["blobId"] = this.blobId;
    if (this.threadId !== undefined) out["threadId"] = this.threadId;
    if (Object.keys(this.keywords).length > 0) out["keywords"] = this.keywords;
    if (this.size !== undefined) out["size"] = this.size;
    if (this.receivedAt !== undefined) out["receivedAt"] = this.receivedAt;
    if (this.messageId !== undefined) out["messageId"] = this.messageId;
    if (this.inReplyTo !== undefined) out["inReplyTo"] = this.inReplyTo;
    if (this.references !== undefined) out["references"] = this.references;
    if (this.sender !== undefined) out["sender"] = this.sender === null ? null : this.sender.map(a => a.toJson());
    if (this.from !== undefined) out["from"] = this.from === null ? null : this.from.map(a => a.toJson());
    if (this.to !== undefined) out["to"] = this.to === null ? null : this.to.map(a => a.toJson());
    if (this.cc !== undefined) out["cc"] = this.cc === null ? null : this.cc.map(a => a.toJson());
    if (this.bcc !== undefined) out["bcc"] = this.bcc === null ? null : this.bcc.map(a => a.toJson());
    if (this.replyTo !== undefined) out["replyTo"] = this.replyTo === null ? null : this.replyTo.map(a => a.toJson());
    if (this.subject !== undefined) out["subject"] = this.subject;
    if (this.sentAt !== undefined) out["sentAt"] = this.sentAt;
    if (this.bodyStructure !== undefined) out["bodyStructure"] = this.bodyStructure.toJson();
    if (this.bodyValues !== undefined) {
      const map: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(this.bodyValues)) {
        map[k] = v.toJson();
      }
      out["bodyValues"] = map;
    }
    if (this.textBody !== undefined) out["textBody"] = this.textBody.map(p => p.toJson());
    if (this.htmlBody !== undefined) out["htmlBody"] = this.htmlBody.map(p => p.toJson());
    if (this.attachments !== undefined) out["attachments"] = this.attachments.map(p => p.toJson());
    if (this.hasAttachment !== undefined) out["hasAttachment"] = this.hasAttachment;
    if (this.preview !== undefined) out["preview"] = this.preview;

    return out;
  }
}
