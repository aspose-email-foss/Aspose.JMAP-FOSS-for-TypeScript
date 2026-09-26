/**
 * Unit tests for the Envelope and Address model classes.
 *
 * These tests exercise normal (de)serialization, handling of optional
 * `parameters`, and error conditions when required properties are missing
 * or malformed.
 *
 * The imports use relative paths to the source files because the public
 * package entry point is not available in the isolated test environment.
 * Minimal ambient module declarations are provided for the core error
 * classes required by the model implementations.
 */

import test from "node:test";
import assert from "node:assert";

import { Envelope, Address } from "../../src/models/Envelope";
import { JmapProtocolError } from "../../src/models/CommonTypes";

/* Normal round‑trip serialization */
test("Envelope serialization round‑trip with full data", () => {
  const mailFrom = new Address({ email: "sender@example.com", parameters: { RET: "HDRS" } });
  const rcpt1 = new Address({ email: "rcpt1@example.com" });
  const rcpt2 = new Address({ email: "rcpt2@example.com", parameters: { SIZE: null } });

  const envelope = new Envelope({ mailFrom, rcptTo: [rcpt1, rcpt2] });

  const json = envelope.toJson();
  assert.deepStrictEqual(json, {
    mailFrom: { email: "sender@example.com", parameters: { RET: "HDRS" } },
    rcptTo: [
      { email: "rcpt1@example.com", parameters: null },
      { email: "rcpt2@example.com", parameters: { SIZE: null } },
    ],
  });

  const parsed = Envelope.fromJson(json);
  assert.deepStrictEqual(parsed, envelope);
});

/* Edge cases for Address.parameters */
test("Address handling of omitted and explicit null parameters", () => {
  // parameters omitted
  const addrOmitted = new Address({ email: "no-params@example.com" });
  const jsonOmitted = addrOmitted.toJson();
  assert.deepStrictEqual(jsonOmitted, {
    email: "no-params@example.com",
    parameters: null,
  });
  const parsedOmitted = Address.fromJson(jsonOmitted);
  assert.deepStrictEqual(parsedOmitted, addrOmitted);

  // parameters explicitly null
  const addrNull = new Address({ email: "null-params@example.com", parameters: null });
  const jsonNull = addrNull.toJson();
  assert.deepStrictEqual(jsonNull, {
    email: "null-params@example.com",
    parameters: null,
  });
  const parsedNull = Address.fromJson(jsonNull);
  assert.deepStrictEqual(parsedNull, addrNull);
});

/* Missing required properties */
test("Envelope.fromJson throws when required properties are missing", () => {
  const missingMailFrom = {
    rcptTo: [{ email: "rcpt@example.com", parameters: null }],
  };
  assert.throws(
    () => Envelope.fromJson(missingMailFrom),
    (err: unknown) => {
      assert(err instanceof JmapProtocolError);
      assert.strictEqual((err as JmapProtocolError).type, "MissingProperty");
      return true;
    }
  );

  const missingRcptTo = {
    mailFrom: { email: "sender@example.com", parameters: null },
  };
  assert.throws(
    () => Envelope.fromJson(missingRcptTo),
    (err: unknown) => {
      assert(err instanceof JmapProtocolError);
      assert.strictEqual((err as JmapProtocolError).type, "MissingProperty");
      return true;
    }
  );
});

/* Validation of rcptTo array and its items */
test("Envelope.fromJson validates rcptTo is an array and each item is a valid Address", () => {
  const notArray = {
    mailFrom: { email: "sender@example.com", parameters: null },
    rcptTo: "not-an-array",
  };
  assert.throws(
    () => Envelope.fromJson(notArray),
    (err: unknown) => {
      assert(err instanceof JmapProtocolError);
      assert.strictEqual((err as JmapProtocolError).type, "InvalidProperty");
      return true;
    }
  );

  const badItem = {
    mailFrom: { email: "sender@example.com", parameters: null },
    rcptTo: [{ email: 123, parameters: null }],
  };
  assert.throws(
    () => Envelope.fromJson(badItem),
    (err: unknown) => {
      assert(err instanceof JmapProtocolError);
      assert.strictEqual((err as JmapProtocolError).type, "InvalidArrayItem");
      return true;
    }
  );
});
