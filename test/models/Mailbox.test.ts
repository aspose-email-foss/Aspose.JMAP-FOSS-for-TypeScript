/**
 * Unit tests for {@link Mailbox} and {@link MailboxRights}.
 *
 * These tests verify correct (de)serialization and validation behaviour.
 */

import { test } from "node:test";
import assert from "node:assert";

import { Mailbox, MailboxRights } from "../../src/models/Mailbox";
import { JmapProtocolError } from "../../src/models/CommonTypes";

test("MailboxRights round‑trip serialization", () => {
  const rights = new MailboxRights({
    mayReadItems: true,
    mayAddItems: false,
    mayRemoveItems: true,
    maySetSeen: false,
    maySetKeywords: true,
    mayCreateChild: false,
    mayRename: true,
    mayDelete: false,
    maySubmit: true,
  });

  const json = rights.toJson();
  const expected = {
    mayReadItems: true,
    mayAddItems: false,
    mayRemoveItems: true,
    maySetSeen: false,
    maySetKeywords: true,
    mayCreateChild: false,
    mayRename: true,
    mayDelete: false,
    maySubmit: true,
  };
  assert.deepStrictEqual(json, expected);

  const parsed = MailboxRights.fromJson(json);
  assert.deepStrictEqual(parsed, rights);
});

test("Mailbox full round‑trip serialization", () => {
  const rights = new MailboxRights({
    mayReadItems: true,
    mayAddItems: true,
    mayRemoveItems: true,
    maySetSeen: true,
    maySetKeywords: true,
    mayCreateChild: true,
    mayRename: true,
    mayDelete: true,
    maySubmit: true,
  });

  const mailbox = new Mailbox({
    id: "mb1",
    name: "Inbox",
    parentId: "parent1",
    role: "inbox",
    sortOrder: 10,
    totalEmails: 123,
    unreadEmails: 4,
    totalThreads: 80,
    unreadThreads: 2,
    myRights: rights,
    isSubscribed: true,
  });

  const json = mailbox.toJson();
  const expected = {
    id: "mb1",
    name: "Inbox",
    parentId: "parent1",
    role: "inbox",
    sortOrder: 10,
    totalEmails: 123,
    unreadEmails: 4,
    totalThreads: 80,
    unreadThreads: 2,
    myRights: rights.toJson(),
    isSubscribed: true,
  };
  assert.deepStrictEqual(json, expected);

  const parsed = Mailbox.fromJson(json);
  assert.deepStrictEqual(parsed.toJson(), expected);
});

test("Mailbox handles optional/null fields and defaults", () => {
  const input = {
    id: "mb-null",
    name: "Empty",
    parentId: null,
    role: null,
    // sortOrder omitted -> default 0
    // isSubscribed omitted -> default false
  };

  const mailbox = Mailbox.fromJson(input);
  assert.strictEqual(mailbox.id, "mb-null");
  assert.strictEqual(mailbox.name, "Empty");
  assert.strictEqual(mailbox.parentId, null);
  assert.strictEqual(mailbox.role, null);
  assert.strictEqual(mailbox.sortOrder, 0);
  assert.strictEqual(mailbox.isSubscribed, false);

  const output = mailbox.toJson();
  const expected = {
    id: "mb-null",
    name: "Empty",
    parentId: null,
    role: null,
    sortOrder: 0,
    isSubscribed: false,
  };
  assert.deepStrictEqual(output, expected);
});

test("Mailbox.fromJson throws JmapProtocolError when required 'name' is missing", () => {
  const bad = { id: "bad" };
  assert.throws(() => Mailbox.fromJson(bad), (e: unknown) => e instanceof JmapProtocolError);
});

test("Mailbox.fromJson throws JmapProtocolError when 'name' has wrong type", () => {
  const bad = { name: 123 };
  assert.throws(() => Mailbox.fromJson(bad), (e: unknown) => e instanceof JmapProtocolError);
});
