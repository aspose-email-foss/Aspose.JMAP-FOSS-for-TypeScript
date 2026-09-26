import test from "node:test";
import assert from "node:assert";

import { EmailAddress } from "../../src/models/EmailAddress";

test("EmailAddress.fromJson creates instance with both fields", () => {
    const json = { name: "Alice", email: "alice@example.com" };
    const addr = EmailAddress.fromJson(json);
    assert.strictEqual(addr.name, "Alice");
    assert.strictEqual(addr.email, "alice@example.com");
    assert.deepStrictEqual(addr.toJson(), json);
});

test("EmailAddress.fromJson treats missing name as null", () => {
    const json = { email: "bob@example.com" };
    const addr = EmailAddress.fromJson(json);
    assert.strictEqual(addr.name, null);
    assert.strictEqual(addr.email, "bob@example.com");
    assert.deepStrictEqual(addr.toJson(), { name: null, email: "bob@example.com" });
});

test("EmailAddress.fromJson accepts explicit null name", () => {
    const json = { name: null, email: "carol@example.com" };
    const addr = EmailAddress.fromJson(json);
    assert.strictEqual(addr.name, null);
    assert.strictEqual(addr.email, "carol@example.com");
    assert.deepStrictEqual(addr.toJson(), json);
});

test("EmailAddress.fromJson throws TypeError when email is missing", () => {
    const json = { name: "Dave" };
    assert.throws(() => {
        EmailAddress.fromJson(json);
    }, TypeError);
});

test("EmailAddress.fromJson throws TypeError when name has wrong type", () => {
    const json = { name: 123, email: "eve@example.com" };
    assert.throws(() => {
        EmailAddress.fromJson(json);
    }, TypeError);
});
