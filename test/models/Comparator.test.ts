import test from "node:test";
import assert from "node:assert";

import { Comparator } from "../../src/models/Comparator";
import { JmapProtocolError } from "../../src/models/CommonTypes";

/* Normal case with all fields */
test("Comparator.fromJson creates instance with all fields", () => {
  const json = {
    property: "subject",
    isAscending: false,
    collation: "en-US",
  };

  const comp = Comparator.fromJson(json);
  assert.strictEqual(comp.property, "subject");
  assert.strictEqual(comp.isAscending, false);
  assert.strictEqual(comp.collation, "en-US");

  const serialized = comp.toJson();
  assert.deepStrictEqual(serialized, json);
});

/* Defaults when optional fields are omitted */
test("Comparator.fromJson applies defaults when optional fields are omitted", () => {
  const json = {
    property: "receivedAt",
  };

  const comp = Comparator.fromJson(json);
  assert.strictEqual(comp.property, "receivedAt");
  assert.strictEqual(comp.isAscending, true); // default
  assert.strictEqual(comp.collation, null); // default

  const expected = {
    property: "receivedAt",
    isAscending: true,
    collation: null,
  };
  assert.deepStrictEqual(comp.toJson(), expected);
});

/* Explicit null collation */
test("Comparator.fromJson accepts explicit null collation", () => {
  const json = {
    property: "size",
    collation: null,
  };

  const comp = Comparator.fromJson(json);
  assert.strictEqual(comp.property, "size");
  assert.strictEqual(comp.isAscending, true); // default
  assert.strictEqual(comp.collation, null);

  const expected = {
    property: "size",
    isAscending: true,
    collation: null,
  };
  assert.deepStrictEqual(comp.toJson(), expected);
});

/* Invalid property type */
test("Comparator.fromJson throws JmapProtocolError when property is not a string", () => {
  const json = {
    property: 123,
  };

  assert.throws(
    () => Comparator.fromJson(json as unknown as Record<string, unknown>),
    (err) => {
      assert(err instanceof JmapProtocolError);
      assert.strictEqual((err as JmapProtocolError).message, "Comparator.property must be a string");
      return true;
    },
  );
});

/* Invalid isAscending type */
test("Comparator.fromJson throws JmapProtocolError when isAscending is not a boolean", () => {
  const json = {
    property: "subject",
    isAscending: "yes",
  };

  assert.throws(
    () => Comparator.fromJson(json as unknown as Record<string, unknown>),
    (err) => {
      assert(err instanceof JmapProtocolError);
      assert.strictEqual((err as JmapProtocolError).message, "Comparator.isAscending must be a boolean");
      return true;
    },
  );
});

/* Invalid collation type */
test("Comparator.fromJson throws JmapProtocolError when collation is of invalid type", () => {
  const json = {
    property: "subject",
    collation: 42,
  };

  assert.throws(
    () => Comparator.fromJson(json as unknown as Record<string, unknown>),
    (err) => {
      assert(err instanceof JmapProtocolError);
      assert.strictEqual((err as JmapProtocolError).message, "Comparator.collation must be a string or null");
      return true;
    },
  );
});
