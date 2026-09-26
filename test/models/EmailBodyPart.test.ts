/**
 * Unit tests for EmailBodyPart model (de)serialization.
 *
 * These tests import the model classes directly from the source tree to avoid
 * reliance on the package's public entry point, which may not be set up in the
 * test environment.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { EmailBodyPart } from "../../src/models/EmailBodyPart";
import { EmailHeader } from "../../src/models/EmailHeader";

test("EmailBodyPart.fromJson and toJson – full data with nested part", async (t) => {
  const rawHeader = { name: "Subject", value: "Test email" };
  const header = EmailHeader.fromJson(rawHeader);

  const nestedRaw = {
    partId: "2",
    blobId: "blob2",
    size: 123,
    headers: [rawHeader],
    name: "attachment.txt",
    type: "text/plain",
    charset: "utf-8",
    disposition: "attachment",
    cid: null,
    language: ["en"],
    location: null,
    subParts: null,
  };

  const raw = {
    partId: "1",
    blobId: "blob1",
    size: 456,
    headers: [rawHeader],
    name: null,
    type: "multipart/mixed",
    charset: null,
    disposition: null,
    cid: null,
    language: null,
    location: null,
    subParts: [nestedRaw],
  };

  const part = EmailBodyPart.fromJson(raw);

  // Verify top‑level properties
  assert.equal(part.partId, "1");
  assert.equal(part.blobId, "blob1");
  assert.equal(part.size, 456);
  assert.deepStrictEqual(part.headers, [header]);
  assert.equal(part.name, null);
  assert.equal(part.type, "multipart/mixed");
  assert.equal(part.charset, null);
  assert.equal(part.disposition, null);
  assert.equal(part.cid, null);
  assert.equal(part.language, null);
  assert.equal(part.location, null);

  // Verify nested part
  assert.ok(Array.isArray(part.subParts));
  assert.equal(part.subParts?.length, 1);
  const nested = part.subParts![0];
  assert.equal(nested.partId, "2");
  assert.equal(nested.blobId, "blob2");
  assert.equal(nested.size, 123);
  assert.equal(nested.name, "attachment.txt");
  assert.equal(nested.type, "text/plain");
  assert.equal(nested.charset, "utf-8");
  assert.equal(nested.disposition, "attachment");
  assert.equal(nested.cid, null);
  assert.deepStrictEqual(nested.language, ["en"]);
  assert.equal(nested.location, null);
  assert.equal(nested.subParts, null);
  assert.deepStrictEqual(nested.headers, [header]);

  // Round‑trip serialization should reproduce the original JSON shape
  const roundTrip = part.toJson();
  assert.deepStrictEqual(roundTrip, raw);
});

test("EmailBodyPart.fromJson – optional fields null and empty headers", async (t) => {
  const raw = {
    partId: null,
    blobId: null,
    size: 0,
    headers: [],
    name: null,
    type: "text/plain",
    charset: null,
    disposition: null,
    cid: null,
    language: null,
    location: null,
    subParts: null,
  };

  const part = EmailBodyPart.fromJson(raw);

  assert.equal(part.partId, null);
  assert.equal(part.blobId, null);
  assert.equal(part.size, 0);
  assert.deepStrictEqual(part.headers, []);
  assert.equal(part.name, null);
  assert.equal(part.type, "text/plain");
  assert.equal(part.charset, null);
  assert.equal(part.disposition, null);
  assert.equal(part.cid, null);
  assert.equal(part.language, null);
  assert.equal(part.location, null);
  assert.equal(part.subParts, null);

  const roundTrip = part.toJson();
  assert.deepStrictEqual(roundTrip, raw);
});

test("EmailBodyPart.fromJson – throws on invalid shape", async (t) => {
  const badRaw = {
    partId: "1",
    blobId: "blob1",
    size: "not-a-number", // invalid: should be a number
    headers: [],
    name: null,
    type: "text/plain",
    charset: null,
    disposition: null,
    cid: null,
    language: null,
    location: null,
    subParts: null,
  };

  assert.throws(
    () => EmailBodyPart.fromJson(badRaw as unknown),
    (err) => err instanceof Error,
    "Expected an Error (JmapProtocolError) for invalid size type"
  );
});
