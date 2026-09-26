/**
 * Unit tests for {@link EmailHeader}.
 *
 * These tests verify correct (de)serialization and error handling of the EmailHeader model.
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";

import { EmailHeader } from "../../src/models/EmailHeader";
import { JmapProtocolError } from "../../src/models/CommonTypes";

test("EmailHeader.fromJson creates an instance with valid data", () => {
  const json = { name: "Subject", value: "Hello World" };
  const header = EmailHeader.fromJson(json);
  assert.ok(header instanceof EmailHeader);
  assert.equal(header.name, "Subject");
  assert.equal(header.value, "Hello World");
});

test("EmailHeader.toJson returns the original JSON representation", () => {
  const header = new EmailHeader({ name: "From", value: "alice@example.com" });
  const json = header.toJson();
  assert.deepEqual(json, { name: "From", value: "alice@example.com" });
});

test("EmailHeader.fromJson throws JmapProtocolError when input is not an object", () => {
  assert.throws(
    () => {
      // @ts-ignore: intentional misuse for test
      EmailHeader.fromJson(null);
    },
    (err: unknown) => {
      assert.ok(err instanceof JmapProtocolError);
      assert.equal((err as JmapProtocolError).type, "InvalidEmailHeader");
      return true;
    },
  );
});

test("EmailHeader.fromJson throws JmapProtocolError when 'name' is missing", () => {
  const json = { value: "Missing name" };
  assert.throws(
    () => EmailHeader.fromJson(json),
    (err: unknown) => {
      assert.ok(err instanceof JmapProtocolError);
      assert.equal((err as JmapProtocolError).type, "InvalidEmailHeader");
      return true;
    },
  );
});

test("EmailHeader.fromJson throws JmapProtocolError when 'value' is missing", () => {
  const json = { name: "MissingValue" };
  assert.throws(
    () => EmailHeader.fromJson(json),
    (err: unknown) => {
      assert.ok(err instanceof JmapProtocolError);
      assert.equal((err as JmapProtocolError).type, "InvalidEmailHeader");
      return true;
    },
  );
});

test("EmailHeader.fromJson throws JmapProtocolError when 'name' is not a string", () => {
  const json = { name: 123, value: "Number as name" };
  assert.throws(
    () => EmailHeader.fromJson(json),
    (err: unknown) => {
      assert.ok(err instanceof JmapProtocolError);
      assert.equal((err as JmapProtocolError).type, "InvalidEmailHeader");
      return true;
    },
  );
});

test("EmailHeader.fromJson throws JmapProtocolError when 'value' is not a string", () => {
  const json = { name: "InvalidValue", value: false };
  assert.throws(
    () => EmailHeader.fromJson(json),
    (err: unknown) => {
      assert.ok(err instanceof JmapProtocolError);
      assert.equal((err as JmapProtocolError).type, "InvalidEmailHeader");
      return true;
    },
  );
});
