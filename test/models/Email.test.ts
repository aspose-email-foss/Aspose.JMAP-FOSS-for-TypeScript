/**
 * Unit tests for the Email model (de)serialization.
 *
 * These tests import the model classes directly via relative paths to avoid
 * reliance on the package's public entry point during compilation.
 */
import { test } from "node:test";
import assert from "node:assert";

import { Email } from "../../src/models/Email";
import { EmailBodyValue } from "../../src/models/Email";
import { EmailAddress } from "../../src/models/EmailAddress";
import { EmailBodyPart } from "../../src/models/EmailBodyPart";
import { EmailHeader } from "../../src/models/EmailHeader";

/**
 * Helper to create a minimal EmailHeader instance.
 */
function makeHeader(name: string, value: string): EmailHeader {
  // EmailHeader constructor expects an object with `name` and `value`.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return new EmailHeader({ name, value });
}

/**
 * Helper to create a minimal EmailBodyPart instance.
 */
function makeBodyPart(): EmailBodyPart {
  return new EmailBodyPart({
    partId: null,
    blobId: null,
    size: 0,
    headers: [makeHeader("Content-Type", "text/plain")],
    name: null,
    type: "text/plain",
    charset: null,
    disposition: null,
    cid: null,
    language: null,
    location: null,
    subParts: null,
  });
}

/**
 * Full round‑trip test: fromJson → toJson should be lossless for a
 * fully populated Email object.
 */
test("Email.fromJson / Email.toJson full round‑trip", () => {
  const json: Record<string, unknown> = {
    id: "email-123",
    blobId: "blob-456",
    threadId: "thread-789",
    mailboxIds: { "mailbox-1": true },
    keywords: { "$seen": true },
    size: 1024,
    receivedAt: "2023-01-01T12:00:00Z",
    messageId: ["<msg-1@example.com>"],
    inReplyTo: ["<msg-0@example.com>"],
    references: ["<ref-1@example.com>", "<ref-2@example.com>"],
    sender: [{ name: "Alice", email: "alice@example.com" }],
    from: [{ name: null, email: "alice@example.com" }],
    to: [{ name: "Bob", email: "bob@example.com" }],
    cc: [],
    bcc: [],
    replyTo: null,
    subject: "Test email",
    sentAt: "2023-01-01T12:00:00Z",
    bodyStructure: makeBodyPart().toJson(),
    bodyValues: {
      "0": {
        value: "Hello, world!",
        isEncodingProblem: false,
        isTruncated: false,
      },
    },
    textBody: [makeBodyPart().toJson()],
    htmlBody: [makeBodyPart().toJson()],
    attachments: [makeBodyPart().toJson()],
    hasAttachment: false,
    preview: "Hello, world!",
  };

  const email = Email.fromJson(json);
  const roundTrip = email.toJson();

  assert.deepStrictEqual(roundTrip, json);
});

/**
 * Minimal Email test: only required fields present.
 * Optional fields should be undefined and omitted from toJson output.
 */
test("Email.fromJson with only required fields", () => {
  const json = {
    mailboxIds: { "mailbox-2": false },
  };

  const email = Email.fromJson(json);
  const out = email.toJson();

  // Only `mailboxIds` should be present.
  assert.deepStrictEqual(Object.keys(out), ["mailboxIds"]);
  assert.deepStrictEqual(out.mailboxIds, { "mailbox-2": false });

  // Optional properties should be undefined on the instance.
  assert.strictEqual(email.id, undefined);
  assert.deepStrictEqual(email.keywords, {});
});

/**
 * EmailBodyValue.fromJson validation: should throw on malformed input.
 */
test("EmailBodyValue.fromJson throws on invalid shape", () => {
  const badInputs: unknown[] = [
    null,
    42,
    { value: 123, isEncodingProblem: false, isTruncated: false },
    { value: "text", isEncodingProblem: "no", isTruncated: false },
    { value: "text", isEncodingProblem: false, isTruncated: null },
  ];

  for (const input of badInputs) {
    assert.throws(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      EmailBodyValue.fromJson(input);
    }, /EmailBodyValue/);
  }
});
