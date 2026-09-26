/**
 * Submission module mixin for {@link JmapClientCore}.
 *
 * Provides methods for creating, cancelling, and listing {@link EmailSubmission} objects.
 */
import { Comparator } from "./models/Comparator";
import { EmailSubmission } from "./models/EmailSubmission";
import { SetError, JmapProtocolError } from "./models/CommonTypes";
import { JmapClientCore } from "./client-core";

/**
 * Helper type for mixin constructors.
 */
type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Result shape of {@link listSubmissions}.
 */
export interface ListSubmissionsResult {
  /** Identifier of the account the query was performed on. */
  accountId: string;
  /** State token for the query. */
  queryState: string;
  /** Whether the server can calculate changes for this query. */
  canCalculateChanges: boolean;
  /** Zero‑based offset of the first returned id. */
  position: number;
  /** List of submission ids matching the query. */
  ids: string[];
  /** Total number of matching ids, if `calculateTotal` was true. */
  total?: number;
}

/**
 * Mixin adding Submission‑related methods to a {@link JmapClientCore} subclass.
 *
 * @param Base - Base class extending {@link JmapClientCore}.
 * @returns A subclass with Submission methods.
 */
export function SubmissionClientMixin<TBase extends Constructor<JmapClientCore>>(
  Base: TBase,
) {
  return class SubmissionClient extends Base {
    /**
     * Sends an {@link EmailSubmission} (creates it on the server).
     *
     * @param accountId - Identifier of the account owning the submission.
     * @param submission - The {@link EmailSubmission} to create (without `id`).
     * @param onSuccessUpdateEmail - Optional map of per‑creation‑id patches to apply to the
     *                               underlying Email (e.g. move from Drafts to Sent).
     * @returns The created {@link EmailSubmission} with server‑assigned fields merged.
     * @throws {@link JmapProtocolError} if the server response is malformed or missing data.
     */
    public async send(
      accountId: string,
      submission: EmailSubmission,
      onSuccessUpdateEmail?: Record<string, unknown>,
    ): Promise<EmailSubmission> {
      const clientId = "c1";

      const args: Record<string, unknown> = {
        accountId,
        create: { [clientId]: submission.toJson() },
      };
      if (onSuccessUpdateEmail) {
        args.onSuccessUpdateEmail = onSuccessUpdateEmail;
      }

      const respEnvelope = await this.sendRequest(
        [{ name: "EmailSubmission/set", arguments: args, methodCallId: "c1" }],
        ["urn:ietf:params:jmap:submission"],
      );

      const resp = respEnvelope.methodResponses[0];
      if (!resp) {
        throw new JmapProtocolError("missingResponse", "No matching response for EmailSubmission/set call");
      }
      const respArgs = resp.arguments as Record<string, unknown>;

      const created = respArgs["created"] as Record<string, unknown> | undefined;
      if (!created || !(clientId in created)) {
        throw new JmapProtocolError(
          "invalidResponse",
          "EmailSubmission/set response missing created entry",
        );
      }

      const serverPartial = created[clientId] as Record<string, unknown>;
      const merged = { ...submission.toJson(), ...serverPartial };
      return EmailSubmission.fromJson(merged);
    }

    /**
     * Cancels a previously created {@link EmailSubmission}.
     *
     * @param accountId - Identifier of the account owning the submission.
     * @param submissionId - Identifier of the {@link EmailSubmission} to cancel.
     * @throws {@link JmapProtocolError} if the server response is malformed.
     */
    public async cancelSend(
      accountId: string,
      submissionId: string,
    ): Promise<void> {
      const args: Record<string, unknown> = {
        accountId,
        update: {
          // A PatchObject key is a JSON Pointer (RFC 6901) relative to the object being
          // patched - a bare top-level property name has no leading slash; "/undoStatus"
          // would instead point at a property literally named the empty string, which a
          // real JMAP server rejects/ignores.
          [submissionId]: { undoStatus: "canceled" },
        },
      };

      await this.sendRequest(
        [{ name: "EmailSubmission/set", arguments: args, methodCallId: "c1" }],
        ["urn:ietf:params:jmap:submission"],
      );
      // No further processing required; any protocol error would have been thrown by sendRequest.
    }

    /**
     * Lists {@link EmailSubmission} identifiers matching the given criteria.
     *
     * @param accountId - Identifier of the account to query.
     * @param filter - Optional filter object (see JMAP spec for supported fields).
     * @param sort - Optional array of {@link Comparator} objects to order results.
     * @param position - Zero‑based offset of the first result to return (default 0).
     * @param limit - Maximum number of results to return (null for no limit).
     * @param calculateTotal - Whether to request the total count of matching ids.
     * @returns A {@link ListSubmissionsResult} containing the query outcome.
     * @throws {@link JmapProtocolError} if the server response is malformed.
     */
    public async listSubmissions(
      accountId: string,
      filter?: Record<string, unknown> | null,
      sort?: Comparator[] | null,
      position: number = 0,
      limit?: number | null,
      calculateTotal: boolean = false,
    ): Promise<ListSubmissionsResult> {
      const args: Record<string, unknown> = {
        accountId,
        position,
        calculateTotal,
      };
      if (filter != null) args.filter = filter;
      if (sort != null) args.sort = sort.map((c) => c.toJson());
      if (limit != null) args.limit = limit;

      const respEnvelope = await this.sendRequest(
        [{ name: "EmailSubmission/query", arguments: args, methodCallId: "c1" }],
        ["urn:ietf:params:jmap:submission"],
      );

      const resp = respEnvelope.methodResponses[0];
      if (!resp) {
        throw new JmapProtocolError("missingResponse", "No matching response for EmailSubmission/query call");
      }
      const respArgs = resp.arguments as Record<string, unknown>;

      const result: ListSubmissionsResult = {
        accountId:
          typeof respArgs.accountId === "string" ? respArgs.accountId : "",
        queryState:
          typeof respArgs.queryState === "string" ? respArgs.queryState : "",
        canCalculateChanges:
          typeof respArgs.canCalculateChanges === "boolean"
            ? respArgs.canCalculateChanges
            : false,
        position:
          typeof respArgs.position === "number" ? respArgs.position : 0,
        ids: Array.isArray(respArgs.ids)
          ? (respArgs.ids as unknown[]).filter(
              (v): v is string => typeof v === "string",
            )
          : [],
      };

      if (typeof respArgs.total === "number") {
        result.total = respArgs.total;
      }

      return result;
    }
  };
}
