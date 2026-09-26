/**
 * Unit tests for {@link EmailAddressGroup} (de)serialization.
 *
 * Tests import symbols directly from the source files to avoid package resolution issues.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { EmailAddressGroup } from "../../src/models/EmailAddressGroup";
import { EmailAddress } from "../../src/models/EmailAddress";

test("EmailAddressGroup.fromJson and toJson – normal case", () => {
    const json = {
        name: "Team",
        addresses: [
            { name: "Alice", email: "alice@example.com" },
            { name: null, email: "bob@example.com" },
        ],
    };

    const group = EmailAddressGroup.fromJson(json);
    assert.ok(group instanceof EmailAddressGroup);
    assert.strictEqual(group.name, "Team");
    assert.strictEqual(group.addresses.length, 2);
    assert.strictEqual(group.addresses[0].name, "Alice");
    assert.strictEqual(group.addresses[0].email, "alice@example.com");
    assert.strictEqual(group.addresses[1].name, null);
    assert.strictEqual(group.addresses[1].email, "bob@example.com");

    const roundTrip = group.toJson();
    assert.deepEqual(roundTrip, json);
});

test("EmailAddressGroup.fromJson – null name and empty addresses", () => {
    const json = {
        name: null,
        addresses: [],
    };

    const group = EmailAddressGroup.fromJson(json);
    assert.strictEqual(group.name, null);
    assert.deepEqual(group.addresses, []);

    const roundTrip = group.toJson();
    assert.deepEqual(roundTrip, json);
});

test("EmailAddressGroup.fromJson – missing required property 'name'", () => {
    const json = {
        // name omitted intentionally
        addresses: [{ email: "charlie@example.com", name: "Charlie" }],
    };

    assert.throws(
        () => EmailAddressGroup.fromJson(json as unknown as Record<string, unknown>),
        (err) => {
            assert.ok(err instanceof Error);
            assert.match(err.message, /Missing required property 'name'/);
            return true;
        },
    );
});

test("EmailAddressGroup.fromJson – missing required property 'addresses'", () => {
    const json = {
        name: "Team",
        // addresses omitted intentionally
    };

    assert.throws(
        () => EmailAddressGroup.fromJson(json as unknown as Record<string, unknown>),
        (err) => {
            assert.ok(err instanceof Error);
            assert.match(err.message, /Missing required property 'addresses'/);
            return true;
        },
    );
});

test("EmailAddressGroup.fromJson – 'addresses' not an array", () => {
    const json = {
        name: "Team",
        addresses: "not-an-array",
    };

    assert.throws(
        () => EmailAddressGroup.fromJson(json as unknown as Record<string, unknown>),
        (err) => {
            assert.ok(err instanceof Error);
            assert.match(err.message, /Property 'addresses' must be an array/);
            return true;
        },
    );
});

test("EmailAddressGroup.fromJson – invalid EmailAddress item", () => {
    const json = {
        name: "Team",
        addresses: [
            { email: "dave@example.com", name: "Dave" },
            { name: "Eve" }, // missing required 'email'
        ],
    };

    assert.throws(
        () => EmailAddressGroup.fromJson(json as unknown as Record<string, unknown>),
        (err) => {
            assert.ok(err instanceof Error);
            assert.match(err.message, /Invalid EmailAddress at index 1/);
            return true;
        },
    );
});
