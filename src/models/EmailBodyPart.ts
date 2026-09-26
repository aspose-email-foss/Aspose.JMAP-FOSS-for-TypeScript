/**
 * One node of the Email's MIME bodyStructure tree.
 */
import { EmailHeader } from "./EmailHeader";
import { JmapProtocolError } from "./CommonTypes";

/**
 * Model class representing a node of an Email's MIME bodyStructure tree.
 */
export class EmailBodyPart {
  public readonly partId: string | null;
  public readonly blobId: string | null;
  public readonly size: number;
  public readonly headers: EmailHeader[];
  public readonly name: string | null;
  public readonly type: string;
  public readonly charset: string | null;
  public readonly disposition: string | null;
  public readonly cid: string | null;
  public readonly language: string[] | null;
  public readonly location: string | null;
  public readonly subParts: EmailBodyPart[] | null;

  /**
   * Constructs a new {@link EmailBodyPart}.
   * @param init Fully‑typed initialization object.
   */
  constructor(init: {
    partId: string | null;
    blobId: string | null;
    size: number;
    headers: EmailHeader[];
    name: string | null;
    type: string;
    charset: string | null;
    disposition: string | null;
    cid: string | null;
    language: string[] | null;
    location: string | null;
    subParts: EmailBodyPart[] | null;
  }) {
    this.partId = init.partId;
    this.blobId = init.blobId;
    this.size = init.size;
    this.headers = init.headers;
    this.name = init.name;
    this.type = init.type;
    this.charset = init.charset;
    this.disposition = init.disposition;
    this.cid = init.cid;
    this.language = init.language;
    this.location = init.location;
    this.subParts = init.subParts;
  }

  /**
   * Creates an {@link EmailBodyPart} instance from a raw JSON value.
   * @param data Unknown JSON data.
   * @throws {@link JmapProtocolError} if the data does not conform to the expected shape.
   */
  public static fromJson(data: unknown): EmailBodyPart {
    if (typeof data !== "object" || data === null) {
      throw new JmapProtocolError("Invalid EmailBodyPart: not an object");
    }

    const obj = data as Record<string, unknown>;

    const partId = EmailBodyPart._parseStringOrNull(obj["partId"]);
    const blobId = EmailBodyPart._parseStringOrNull(obj["blobId"]);
    const size = EmailBodyPart._parseNumber(obj["size"]);
    const headersRaw = EmailBodyPart._parseArray(obj["headers"]);
    const headers = headersRaw.map((h) => EmailHeader.fromJson(h));
    const name = EmailBodyPart._parseStringOrNull(obj["name"]);
    const type = EmailBodyPart._parseString(obj["type"]);
    const charset = EmailBodyPart._parseStringOrNull(obj["charset"]);
    const disposition = EmailBodyPart._parseStringOrNull(obj["disposition"]);
    const cid = EmailBodyPart._parseStringOrNull(obj["cid"]);
    const language = EmailBodyPart._parseStringArrayOrNull(obj["language"]);
    const location = EmailBodyPart._parseStringOrNull(obj["location"]);
    const subPartsRaw = EmailBodyPart._parseArrayOrNull(obj["subParts"]);
    const subParts = subPartsRaw?.map((sp) => EmailBodyPart.fromJson(sp)) ?? null;

    return new EmailBodyPart({
      partId,
      blobId,
      size,
      headers,
      name,
      type,
      charset,
      disposition,
      cid,
      language,
      location,
      subParts,
    });
  }

  /**
   * Serialises this instance to a plain JSON object suitable for transmission.
   */
  public toJson(): Record<string, unknown> {
    return {
      partId: this.partId,
      blobId: this.blobId,
      size: this.size,
      headers: this.headers.map((h) => h.toJson()),
      name: this.name,
      type: this.type,
      charset: this.charset,
      disposition: this.disposition,
      cid: this.cid,
      language: this.language,
      location: this.location,
      subParts: this.subParts?.map((sp) => sp.toJson()) ?? null,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers for validation
  // -------------------------------------------------------------------------

  private static _parseString(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }
    throw new JmapProtocolError("Invalid EmailBodyPart: expected string");
  }

  private static _parseStringOrNull(value: unknown): string | null {
    if (value === null) {
      return null;
    }
    return EmailBodyPart._parseString(value);
  }

  private static _parseNumber(value: unknown): number {
    if (typeof value === "number") {
      return value;
    }
    throw new JmapProtocolError("Invalid EmailBodyPart: expected number");
  }

  private static _parseArray(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }
    throw new JmapProtocolError("Invalid EmailBodyPart: expected array");
  }

  private static _parseArrayOrNull(value: unknown): unknown[] | null {
    if (value === null) {
      return null;
    }
    return EmailBodyPart._parseArray(value);
  }

  private static _parseStringArrayOrNull(value: unknown): string[] | null {
    if (value === null) {
      return null;
    }
    const arr = EmailBodyPart._parseArray(value);
    for (const el of arr) {
      if (typeof el !== "string") {
        throw new JmapProtocolError("Invalid EmailBodyPart: expected array of strings");
      }
    }
    return arr as string[];
  }
}
