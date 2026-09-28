// bytesrun.js：按处理预算解析帧事件，用尽预算把余下事件载压账，收尾补齐
import { markOf, valueOf } from "./bytes.js";

function emptyState() {
  return { records: [], big: 0, small: 0, ledger: [], applied: [] };
}

function cloneState(state) {
  const source = state || emptyState();
  return {
    records: (source.records || []).map(function (row) { return [row[0], row[1]]; }),
    big: source.big || 0,
    small: source.small || 0,
    ledger: (source.ledger || []).map(function (row) { return [row[0], row[1]]; }),
    applied: (source.applied || []).slice()
  };
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function validate(event) {
  if (!event || typeof event !== "object" || event.kind !== "frame"
      || typeof event.hex !== "string") {
    fail("E_BAD_EVENT", "事件结构不合法");
  }
  const hex = event.hex;
  if (hex.length !== 10) {
    fail("E_BAD_LEN", "帧十六进制长度不是十位");
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    fail("E_BAD_HEX", "帧含非十六进制字符");
  }
  if (markOf(hex) < 0) {
    fail("E_BAD_MARK", "字节序标记不是零或一");
  }
}

function decodeInto(state, hex) {
  const mark = markOf(hex);
  state.records.push([hex, valueOf(hex, mark)]);
  if (mark === 0) { state.big += 1; } else { state.small += 1; }
  if (!state.applied.includes(hex)) { state.applied.push(hex); }
}

export function step(spec) {
  const source = spec || {};
  const events = Array.isArray(source.events) ? source.events : [];
  events.forEach(validate);

  const state = cloneState(source.state);
  const rawBudget = Number(source.budget);
  const budget = Number.isFinite(rawBudget) ? Math.max(0, Math.trunc(rawBudget)) : 0;

  let served = 0;
  for (const event of events) {
    const hex = event.hex;
    if (state.applied.includes(hex)) { continue; }
    if (served < budget) {
      decodeInto(state, hex);
      served += 1;
    } else {
      state.ledger.push(["frame", hex]);
    }
  }

  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (row) { return [row[0], row[1]]; }),
    judged: served,
    judged_bound: events.length
  };
}

export function close(spec) {
  const source = spec || {};
  const state = cloneState(source.state);
  const pending = state.ledger;
  state.ledger = [];

  let catchup = 0;
  for (const row of pending) {
    decodeInto(state, row[1]);
    catchup += 1;
  }

  return { state: state, catchup: catchup };
}
