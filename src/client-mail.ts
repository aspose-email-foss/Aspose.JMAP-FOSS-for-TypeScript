/**
 * Mail module mixin for {@link JmapClientCore}.
 *
 * Provides convenience methods for Mailbox, Email, Identity and related JMAP calls.
 */
import { JmapClientCore } from "./client-core";
import { Mailbox } from "./models/Mailbox";
import { Email } from "./models/Email";
import { Identity } from "./models/Identity";
import { Comparator } from "./models/Comparator";
import { EmailQueryResponse } from "./models/EmailQueryResponse";
import { JmapProtocolError } from "./models/CommonTypes";
import { JmapResponseEnvelope } from "./models/JmapResponseEnvelope";

/**
 * Helper type for mixin constructors.
 */
type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Returns the arguments of the first method response, or throws JmapProtocolError if the
 * server sent a malformed/empty response ({@code {"methodResponses": []}}) - indexing [0]
 * unguarded would otherwise raise a raw TypeError instead of the library's own error type,
 * breaking any caller that catches only JmapError.
 */
function firstResponseArguments(
  envelope: JmapResponseEnvelope,
  methodName: string,
): Record<string, unknown> {
  const first = envelope.methodResponses[0];
  if (!first) {
    throw new JmapProtocolError("missingResponse", `No matching response for ${methodName} call`);
  }
  return first.arguments as Record<string, unknown>;
}

/**
 * Mixin adding Mail‑related methods to a {@link JmapClientCore} subclass.
 *
 * @param Base Base class extending {@link JmapClientCore}.
 * @returns A class extending the base with mail methods.
 */
export function MailClientMixin<TBase extends Constructor<JmapClientCore>>(
  Base: TBase,
) {
  // The returned class expression is cast to `any` to avoid TS4094
  // (exported anonymous class types may not have private/protected members).
  return class MailClient extends Base {
    /**
     * Lists all mailboxes for the given account.
     *
     * @param accountId Account identifier.
     * @returns Array of {@link Mailbox} objects.
     */
    public async listMailboxes(accountId: string): Promise<Mailbox[]> {
      const resp = await this.sendRequest(
        [
          {
            name: "Mailbox/get",
            arguments: { accountId, ids: null, properties: null },
            methodCallId: "c1",
          },
        ],
        ["urn:ietf:params:jmap:mail"],
      );

      const args = firstResponseArguments(resp, "Mailbox/get");
      const list = (args["list"] as unknown[]) ?? [];
      return list.map((item) => Mailbox.fromJson(item));
    }

    /**
     * Retrieves specific mailboxes by their identifiers.
     *
     * @param accountId Account identifier.
     * @param ids Array of mailbox ids to fetch.
     * @returns Array of {@link Mailbox} objects.
     */
    public async getMailbox(accountId: string, ids: string[]): Promise<Mailbox[]> {
      const resp = await this.sendRequest(
        [
          {
            name: "Mailbox/get",
            arguments: { accountId, ids, properties: null },
            methodCallId: "c1",
          },
        ],
        ["urn:ietf:params:jmap:mail"],
      );

      const args = firstResponseArguments(resp, "Mailbox/get");
      const list = (args["list"] as unknown[]) ?? [];
      return list.map((item) => Mailbox.fromJson(item));
    }

    /**
     * Creates a new mailbox.
     *
     * @param accountId Account identifier.
     * @param mailbox Mailbox data (without server‑assigned fields).
     * @returns The created {@link Mailbox} with server‑assigned properties merged.
     */
    public async createMailbox(accountId: string, mailbox: Mailbox): Promise<Mailbox> {
      const createId = "new";
      const resp = await this.sendRequest(
        [
          {
            name: "Mailbox/set",
            arguments: {
              accountId,
              create: { [createId]: mailbox.toJson() },
            },
            methodCallId: "c1",
          },
        ],
        ["urn:ietf:params:jmap:mail"],
      );

      const args = firstResponseArguments(resp, "Mailbox/set");
      const created = (args["created"] as Record<string, unknown>) ?? {};
      const serverPartial = (created[createId] as Record<string, unknown>) ?? {};

      const merged = { ...mailbox.toJson(), ...serverPartial };
      return Mailbox.fromJson(merged);
    }

    /**
     * Deletes mailboxes.
     *
     * @param accountId Account identifier.
     * @param ids Array of mailbox ids to delete.
     * @returns Array of ids that were destroyed.
     */
    public async deleteMailbox(accountId: string, ids: string[]): Promise<string[]> {
      const resp = await this.sendRequest(
        [
          {
            name: "Mailbox/set",
            arguments: { accountId, destroy: ids },
            methodCallId: "c1",
          },
        ],
        ["urn:ietf:params:jmap:mail"],
      );

      const args = firstResponseArguments(resp, "Mailbox/set");
      return (args["destroyed"] as string[]) ?? [];
    }

    /**
     * Lists messages matching an optional filter.
     *
     * Performs a single `Email/query` call and returns the full response
     * (RFC 8620 section 5.5), including pagination metadata - it does not
     * hydrate the matching ids into full {@link Email} objects. Callers that
     * want hydrated messages should pass the returned `ids` to
     * {@link MailClient.fetchMessage}.
     *
     * @param accountId Account identifier.
     * @param filter Optional filter object (as defined by JMAP Email/query).
     * @param sort Optional array of {@link Comparator} objects.
     * @param limit Optional maximum number of results.
     * @returns The {@link EmailQueryResponse} describing the matching ids and pagination info.
     */
    public async listMessages(
      accountId: string,
      filter?: Record<string, unknown>,
      sort?: Comparator[],
      limit?: number,
    ): Promise<EmailQueryResponse> {
      const queryArgs: Record<string, unknown> = { accountId };
      if (filter) queryArgs["filter"] = filter;
      if (sort) queryArgs["sort"] = sort.map((c) => c.toJson());
      if (limit !== undefined) queryArgs["limit"] = limit;

      const queryResp = await this.sendRequest(
        [
          {
            name: "Email/query",
            arguments: queryArgs,
            methodCallId: "c1",
          },
        ],
        ["urn:ietf:params:jmap:mail"],
      );

      const queryResult = firstResponseArguments(queryResp, "Email/query");
      return EmailQueryResponse.fromJson(queryResult);
    }

    /**
     * Retrieves full message objects for the given ids.
     *
     * @param accountId Account identifier.
     * @param ids Array of email ids.
     * @param properties Optional list of properties to include.
     * @returns Array of {@link Email} objects.
     */
    public async fetchMessage(
      accountId: string,
      ids: string[],
      properties?: string[],
    ): Promise<Email[]> {
      const args: Record<string, unknown> = { accountId, ids };
      if (properties) args["properties"] = properties;

      const resp = await this.sendRequest(
        [
          {
            name: "Email/get",
            arguments: args,
            methodCallId: "c1",
          },
        ],
        ["urn:ietf:params:jmap:mail"],
      );

      const result = firstResponseArguments(resp, "Email/get");
      const list = (result["list"] as unknown[]) ?? [];
      return list.map((item) => Email.fromJson(item));
    }

    /**
     * Moves messages to a different mailbox.
     *
     * @param accountId Account identifier.
     * @param ids Array of email ids to move.
     * @param destinationMailboxId Target mailbox id.
     * @returns Array of the partial update data the server echoed back for each message
     *   (per RFC 8620 section 5.3, a "set" update response is PARTIAL - only
     *   server-changed fields are present - so this is intentionally NOT parsed as a
     *   full {@link Email} via `Email.fromJson`, which requires every "required" field).
     */
    public async moveMessage(
      accountId: string,
      ids: string[],
      destinationMailboxId: string,
    ): Promise<Record<string, unknown>[]> {
      const update: Record<string, unknown> = {};
      for (const id of ids) {
        update[id] = { mailboxIds: { [destinationMailboxId]: true } };
      }

      const resp = await this.sendRequest(
        [
          {
            name: "Email/set",
            arguments: { accountId, update },
            methodCallId: "c1",
          },
        ],
        ["urn:ietf:params:jmap:mail"],
      );

      const args = firstResponseArguments(resp, "Email/set");
      const updated = (args["updated"] as Record<string, unknown>) ?? {};
      return Object.values(updated) as Record<string, unknown>[];
    }

    /**
     * Sets or clears a keyword on the given messages.
     *
     * @param accountId Account identifier.
     * @param ids Array of email ids.
     * @param keyword Keyword name (without the leading '$').
     * @param value `true` to set, `false` to clear.
     * @returns Array of the partial update data the server echoed back for each message
     *   (per RFC 8620 section 5.3, a "set" update response is PARTIAL - only
     *   server-changed fields are present - so this is intentionally NOT parsed as a
     *   full {@link Email} via `Email.fromJson`, which requires every "required" field).
     */
    public async setMessageKeyword(
      accountId: string,
      ids: string[],
      keyword: string,
      value: boolean,
    ): Promise<Record<string, unknown>[]> {
      const update: Record<string, unknown> = {};
      for (const id of ids) {
        update[id] = { keywords: { [keyword]: value } };
      }

      const resp = await this.sendRequest(
        [
          {
            name: "Email/set",
            arguments: { accountId, update },
            methodCallId: "c1",
          },
        ],
        ["urn:ietf:params:jmap:mail"],
      );

      const args = firstResponseArguments(resp, "Email/set");
      const updated = (args["updated"] as Record<string, unknown>) ?? {};
      return Object.values(updated) as Record<string, unknown>[];
    }

    /**
     * Deletes messages.
     *
     * @param accountId Account identifier.
     * @param ids Array of email ids to delete.
     * @returns Array of ids that were destroyed.
     */
    public async deleteMessage(accountId: string, ids: string[]): Promise<string[]> {
      const resp = await this.sendRequest(
        [
          {
            name: "Email/set",
            arguments: { accountId, destroy: ids },
            methodCallId: "c1",
          },
        ],
        ["urn:ietf:params:jmap:mail"],
      );

      const args = firstResponseArguments(resp, "Email/set");
      return (args["destroyed"] as string[]) ?? [];
    }

    /**
     * Lists all identities for the given account.
     *
     * @param accountId Account identifier.
     * @returns Array of {@link Identity} objects.
     */
    public async listIdentities(accountId: string): Promise<Identity[]> {
      const resp = await this.sendRequest(
        [
          {
            name: "Identity/get",
            arguments: { accountId, ids: null, properties: null },
            methodCallId: "c1",
          },
        ],
        ["urn:ietf:params:jmap:mail"],
      );

      const args = firstResponseArguments(resp, "Identity/get");
      const list = (args["list"] as unknown[]) ?? [];
      return list.map((item) => Identity.fromJson(item));
    }
  } as any;
}
