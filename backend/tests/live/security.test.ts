import test from "node:test";
import assert from "node:assert/strict";
import { redact } from "../../src/live/security.js";
import { ReadOnlyToolGuard, RENDER_READ_TOOLS } from "../../src/live/guard.js";
test("redaction removes common credentials", () => {
  const text = redact(
    "Authorization: Bearer abcdefghijklmnop\nAPI_TOKEN=secret\npostgres://u:pass@host/db",
  );
  assert.ok(!text.includes("secret"));
  assert.ok(!text.includes("pass"));
  assert.match(text, /REDACTED/);
});
test("guard rejects unknown and mutating tools", () => {
  const guard = new ReadOnlyToolGuard(RENDER_READ_TOOLS);
  assert.doesNotThrow(() => guard.assertAllowed("list_logs"));
  assert.throws(() => guard.assertAllowed("trigger_deploy"));
  assert.throws(() => guard.assertAllowed("query_render_postgres"));
});
