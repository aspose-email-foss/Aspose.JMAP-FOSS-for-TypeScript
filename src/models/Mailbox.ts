/**
 * Represents the rights a user has on a Mailbox.
 *
 * All properties are required and must be boolean values.
 */
export class MailboxRights {
  public readonly mayReadItems: boolean;
  public readonly mayAddItems: boolean;
  public readonly mayRemoveItems: boolean;
  public readonly maySetSeen: boolean;
  public readonly maySetKeywords: boolean;
  public readonly mayCreateChild: boolean;
  public readonly mayRename: boolean;
  public readonly mayDelete: boolean;
  public readonly maySubmit: boolean;

  /**
   * Constructs a new {@link MailboxRights} instance.
   *
   * @param params - An object containing all required boolean rights.
   */
  constructor(params: {
    mayReadItems: boolean;
    mayAddItems: boolean;
    mayRemoveItems: boolean;
    maySetSeen: boolean;
    maySetKeywords: boolean;
    mayCreateChild: boolean;
    mayRename: boolean;
    mayDelete: boolean;
    maySubmit: boolean;
  }) {
    this.mayReadItems = params.mayReadItems;
    this.mayAddItems = params.mayAddItems;
    this.mayRemoveItems = params.mayRemoveItems;
    this.maySetSeen = params.maySetSeen;
    this.maySetKeywords = params.maySetKeywords;
    this.mayCreateChild = params.mayCreateChild;
    this.mayRename = params.mayRename;
    this.mayDelete = params.mayDelete;
    this.maySubmit = params.maySubmit;
  }

  /**
   * Creates a {@link MailboxRights} instance from a raw JSON value.
   *
   * @param data - The unknown JSON value to parse.
   * @throws {JmapProtocolError} If the input is not a valid MailboxRights object.
   */
  public static fromJson(data: unknown): MailboxRights {
    if (typeof data !== "object" || data === null) {
      throw new JmapProtocolError("Invalid MailboxRights JSON: not an object");
    }

    const {
      mayReadItems,
      mayAddItems,
      mayRemoveItems,
      maySetSeen,
      maySetKeywords,
      mayCreateChild,
      mayRename,
      mayDelete,
      maySubmit,
    } = data as Record<string, unknown>;

    const boolProps = [
      "mayReadItems",
      "mayAddItems",
      "mayRemoveItems",
      "maySetSeen",
      "maySetKeywords",
      "mayCreateChild",
      "mayRename",
      "mayDelete",
      "maySubmit",
    ] as const;

    for (const prop of boolProps) {
      if (typeof (data as any)[prop] !== "boolean") {
        throw new JmapProtocolError(
          `Invalid MailboxRights JSON: property '${prop}' is not a boolean`,
        );
      }
    }

    return new MailboxRights({
      mayReadItems: mayReadItems as boolean,
      mayAddItems: mayAddItems as boolean,
      mayRemoveItems: mayRemoveItems as boolean,
      maySetSeen: maySetSeen as boolean,
      maySetKeywords: maySetKeywords as boolean,
      mayCreateChild: mayCreateChild as boolean,
      mayRename: mayRename as boolean,
      mayDelete: mayDelete as boolean,
      maySubmit: maySubmit as boolean,
    });
  }

  /**
   * Serialises this {@link MailboxRights} instance to a plain JSON object.
   *
   * @returns A JSON‑compatible representation of the rights.
   */
  public toJson(): Record<string, unknown> {
    return {
      mayReadItems: this.mayReadItems,
      mayAddItems: this.mayAddItems,
      mayRemoveItems: this.mayRemoveItems,
      maySetSeen: this.maySetSeen,
      maySetKeywords: this.maySetKeywords,
      mayCreateChild: this.mayCreateChild,
      mayRename: this.mayRename,
      mayDelete: this.mayDelete,
      maySubmit: this.maySubmit,
    };
  }
}

/**
 * A named set of Emails (JMAP's analogue of a mail folder / IMAP mailbox).
 *
 * This type is top‑level and addressable via the JMAP API.
 */
export class Mailbox {
  public readonly id?: string;
  public readonly name: string;
  public readonly parentId?: string | null;
  public readonly role?: string | null;
  public readonly sortOrder: number;
  public readonly totalEmails?: number;
  public readonly unreadEmails?: number;
  public readonly totalThreads?: number;
  public readonly unreadThreads?: number;
  public readonly myRights?: MailboxRights;
  public readonly isSubscribed: boolean;

  /**
   * Constructs a new {@link Mailbox} instance.
   *
   * @param params - An object containing mailbox properties. Fields that are
   * server‑assigned (e.g., `id`, `totalEmails`) may be omitted when creating a
   * new mailbox payload.
   */
  constructor(params: {
    id?: string;
    name: string;
    parentId?: string | null;
    role?: string | null;
    sortOrder?: number;
    totalEmails?: number;
    unreadEmails?: number;
    totalThreads?: number;
    unreadThreads?: number;
    myRights?: MailboxRights;
    isSubscribed?: boolean;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.parentId = params.parentId;
    this.role = params.role;
    this.sortOrder = params.sortOrder ?? 0;
    this.totalEmails = params.totalEmails;
    this.unreadEmails = params.unreadEmails;
    this.totalThreads = params.totalThreads;
    this.unreadThreads = params.unreadThreads;
    this.myRights = params.myRights;
    this.isSubscribed = params.isSubscribed ?? false;
  }

  /**
   * Creates a {@link Mailbox} instance from a raw JSON value.
   *
   * @param data - The unknown JSON value to parse.
   * @throws {JmapProtocolError} If the input does not conform to the Mailbox schema.
   */
  public static fromJson(data: unknown): Mailbox {
    if (typeof data !== "object" || data === null) {
      throw new JmapProtocolError("Invalid Mailbox JSON: not an object");
    }

    const obj = data as Record<string, unknown>;

    const {
      id,
      name,
      parentId,
      role,
      sortOrder,
      totalEmails,
      unreadEmails,
      totalThreads,
      unreadThreads,
      myRights,
      isSubscribed,
    } = obj;

    if (typeof name !== "string") {
      throw new JmapProtocolError("Invalid Mailbox JSON: missing or invalid 'name'");
    }

    return new Mailbox({
      id: typeof id === "string" ? id : undefined,
      name,
      parentId:
        parentId === undefined
          ? undefined
          : parentId === null
          ? null
          : typeof parentId === "string"
          ? parentId
          : undefined,
      role:
        role === undefined
          ? undefined
          : role === null
          ? null
          : typeof role === "string"
          ? role
          : undefined,
      sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
      totalEmails: typeof totalEmails === "number" ? totalEmails : undefined,
      unreadEmails: typeof unreadEmails === "number" ? unreadEmails : undefined,
      totalThreads: typeof totalThreads === "number" ? totalThreads : undefined,
      unreadThreads: typeof unreadThreads === "number" ? unreadThreads : undefined,
      myRights: myRights !== undefined ? MailboxRights.fromJson(myRights) : undefined,
      isSubscribed: typeof isSubscribed === "boolean" ? isSubscribed : undefined,
    });
  }

  /**
   * Serialises this {@link Mailbox} instance to a plain JSON object.
   *
   * Fields that are `undefined` are omitted, matching the JMAP create/update payload
   * expectations.
   *
   * @returns A JSON‑compatible representation of the mailbox.
   */
  public toJson(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      name: this.name,
      sortOrder: this.sortOrder,
      isSubscribed: this.isSubscribed,
    };

    if (this.id !== undefined) json.id = this.id;
    if (this.parentId !== undefined) json.parentId = this.parentId;
    if (this.role !== undefined) json.role = this.role;
    if (this.totalEmails !== undefined) json.totalEmails = this.totalEmails;
    if (this.unreadEmails !== undefined) json.unreadEmails = this.unreadEmails;
    if (this.totalThreads !== undefined) json.totalThreads = this.totalThreads;
    if (this.unreadThreads !== undefined) json.unreadThreads = this.unreadThreads;
    if (this.myRights !== undefined) json.myRights = this.myRights.toJson();

    return json;
  }
}

/* Import JmapProtocolError from the core error module. */
import { JmapProtocolError } from "./CommonTypes";
