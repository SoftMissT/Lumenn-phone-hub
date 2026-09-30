import { LOG_PREFIX } from "./constants.mjs";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(scope = "") {
  let threshold = LEVELS.info;
  const prefix = scope ? `${LOG_PREFIX}[${scope}]` : LOG_PREFIX;

  function write(level, args) {
    if (LEVELS[level] < threshold) return;
    const sink =
      typeof console[level] === "function" ? console[level] : console.log;
    sink.call(console, prefix, ...args);
  }

  return {
    get debugEnabled() {
      return threshold <= LEVELS.debug;
    },
    setDebug(enabled) {
      threshold = enabled ? LEVELS.debug : LEVELS.info;
    },
    debug(...args) {
      write("debug", args);
    },
    info(...args) {
      write("info", args);
    },
    warn(...args) {
      write("warn", args);
    },
    error(...args) {
      write("error", args);
    },
  };
}

export const Logger = createLogger();
