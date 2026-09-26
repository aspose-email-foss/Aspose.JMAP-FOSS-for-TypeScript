import { test } from "node:test";
import { deepStrictEqual, throws } from "node:assert";

import { EmailSubmission } from "../../src/models/EmailSubmission";
import { DeliveryStatus } from "../../src/models/DeliveryStatus";
import { Envelope, Address } from "../../src/models/Envelope";

test("EmailSubmission round‑trip with full payload", () => {
  const json = {
    id: "sub1",
    identityId: "id1",
    emailId: "email1",
    threadId: "thread1",
    envelope: {
      mailFrom: { email: "sender@example.com", parameters: null },
      rcptTo: [{ email: "rcpt@example.com", parameters: null }],
    },
    sendAt: "2023-01-01T00:00:00Z",
    undoStatus: "pending",
    deliveryStatus: {
      "rcpt@example.com": {
        smtpReply: "250 OK",
        delivered: "yes",
        displayed: "yes",
      },
    },
    dsnBlobIds: ["blob1"],
    mdnBlobIds: ["blob2"],
  };

  const submission = EmailSubmission.fromJson(json);

  // nested objects should be proper class instances
  deepStrictEqual(submission.envelope?.mailFrom instanceof Address, true);
  deepStrictEqual(
    submission.envelope?.rcptTo?.[0] instanceof Address,
    true
  );
  deepStrictEqual(
    submission.deliveryStatus?.["rcpt@example.com"] instanceof DeliveryStatus,
    true
  );

  const roundTrip = submission.toJson();
  deepStrictEqual(roundTrip, json);
});

test("EmailSubmission handling of null optional fields", () => {
  const json = {
    identityId: "id2",
    emailId: "email2",
    envelope: null,
    deliveryStatus: null,
  };

  const submission = EmailSubmission.fromJson(json);

  deepStrictEqual(submission.envelope, null);
  deepStrictEqual(submission.deliveryStatus, null);
  deepStrictEqual(submission.id, undefined);
  deepStrictEqual(submission.threadId, undefined);
  deepStrictEqual(submission.sendAt, undefined);
  deepStrictEqual(submission.undoStatus, undefined);
  deepStrictEqual(submission.dsnBlobIds, undefined);
  deepStrictEqual(submission.mdnBlobIds, undefined);

  const roundTrip = submission.toJson();
  const expected = {
    identityId: "id2",
    emailId: "email2",
    envelope: null,
    deliveryStatus: null,
  };
  deepStrictEqual(roundTrip, expected);
});

test("EmailSubmission.fromJson throws on missing required fields", () => {
  const missingIdentity = {
    emailId: "email3",
  };

  throws(
    () => {
      EmailSubmission.fromJson(missingIdentity);
    },
    {
      name: "TypeError",
      message: "EmailSubmission.identityId is required and must be a string",
    }
  );

  const missingEmail = {
    identityId: "id3",
  };

  throws(
    () => {
      EmailSubmission.fromJson(missingEmail);
    },
    {
      name: "TypeError",
      message: "EmailSubmission.emailId is required and must be a string",
    }
  );
});
