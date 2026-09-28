import assert from "node:assert";
import { markOf, valueOf } from "../bytes.js";
import { step, close } from "../bytesrun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { records: [], big: 0, small: 0, ledger: [], applied: [] },
  events: [{ id: 1, kind: "frame", hex: "0000000100" }],
  bad_mark_code: "E_BAD_MARK", bad_len_code: "E_BAD_LEN",
  bad_hex_code: "E_BAD_HEX", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("markOf returns a number", () => {
  assert.strictEqual(typeof markOf("0000000100"), "number");
});

check("valueOf returns a number", () => {
  assert.strictEqual(typeof valueOf("0000000100", 0), "number");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count_events, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
