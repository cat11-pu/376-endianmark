// bytesrun.js：按共用处理预算解帧，用尽后连着载压账，收尾把账做完
import { markOf, valueOf } from "./bytes.js";

function codeOf(spec, name, fallback) {
  return (spec && spec[name]) || fallback;
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function initState(state) {
  const src = state || {};
  return {
    records: Array.isArray(src.records) ? src.records.slice() : [],
    big: src.big || 0,
    small: src.small || 0,
    ledger: Array.isArray(src.ledger) ? src.ledger.slice() : [],
    applied: Array.isArray(src.applied) ? src.applied.slice() : []
  };
}

function eventKey(event) {
  return String(event.kind) + "\u0000" + String(event.hex);
}

// 先校验：结构 → 长度 → 十六进制字符 → 标记，任一不合法即抛错。
function validate(event, spec) {
  if (!event || typeof event !== "object" || Array.isArray(event)
      || event.kind !== "frame" || typeof event.hex !== "string") {
    fail(codeOf(spec, "event_error_code", "E_BAD_EVENT"), "事件结构不合法");
  }
  if (event.hex.length !== 10) {
    fail(codeOf(spec, "bad_len_code", "E_BAD_LEN"), "十六进制长度不是十位");
  }
  if (!/^[0-9a-fA-F]{10}$/.test(event.hex)) {
    fail(codeOf(spec, "bad_hex_code", "E_BAD_HEX"), "含非十六进制字符");
  }
  const mark = markOf(event.hex);
  if (mark !== 0 && mark !== 1) {
    fail(codeOf(spec, "bad_mark_code", "E_BAD_MARK"), "标记不是零或一");
  }
  return mark;
}

function applyEvent(state, event, mark) {
  const value = valueOf(event.hex, mark);
  state.records.push([event.hex, value]);
  if (mark === 0) { state.big += 1; } else { state.small += 1; }
  state.applied.push(eventKey(event));
}

export function step(spec) {
  const input = spec || {};
  const events = Array.isArray(input.events) ? input.events : [];
  const state = initState(input.state);
  const budget = Number.isFinite(input.budget) ? input.budget : 0;

  // 所有事件先过一遍校验，错码按 结构/长度/字符/标记 的先后报。
  const marks = events.map(function (event) { return validate(event, input); });

  const appliedSet = new Set(state.applied);
  const ledgerSet = new Set(state.ledger.map(function (row) {
    return String(row[0]) + "\u0000" + String(row[1]);
  }));

  let served = 0;
  let remaining = budget;
  events.forEach(function (event, index) {
    const key = eventKey(event);
    if (appliedSet.has(key)) {
      return; // 重放：已解过，不花预算、不再上账
    }
    if (remaining > 0) {
      applyEvent(state, event, marks[index]);
      appliedSet.add(key);
      remaining -= 1;
      served += 1;
    } else {
      // 预算用尽，没处理的连着载压账
      if (!ledgerSet.has(key)) {
        state.ledger.push([event.kind, event.hex]);
        ledgerSet.add(key);
      }
    }
  });

  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.slice(),
    judged: served,
    judged_bound: events.length
  };
}

export function close(spec) {
  const input = spec || {};
  const state = initState(input.state);
  const appliedSet = new Set(state.applied);

  let catchup = 0;
  const pending = state.ledger;
  state.ledger = [];
  pending.forEach(function (row) {
    const event = { kind: row[0], hex: row[1] };
    const key = String(event.kind) + "\u0000" + String(event.hex);
    if (appliedSet.has(key)) {
      return;
    }
    // 不限预算把账做完；账上条目同样按规则校验。
    const mark = validate(event, input);
    applyEvent(state, event, mark);
    appliedSet.add(key);
    catchup += 1;
  });

  return { state: state, catchup: catchup };
}
