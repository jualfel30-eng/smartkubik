import { sanitizeLogValue } from './logger';

const levelMap = {
  log: 'log',
  info: 'info',
  debug: 'debug',
  warn: 'warn',
  error: 'error',
};

const shouldLog = (level) => {
  if (level === 'error' || level === 'warn') {
    return true;
  }

  return Boolean(import.meta.env?.DEV);
};

const installConsoleInterceptors = () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.__scopedConsoleInterceptorInstalled) {
    return;
  }

  const original = Object.entries(levelMap).reduce((acc, [alias, method]) => {
    acc[alias] = console[alias]?.bind(console) || console[method]?.bind(console);
    return acc;
  }, {});

  const wrap = (level) => (...args) => {
    if (!shouldLog(level)) {
      return;
    }

    const sanitizedArgs = args.map((arg) => sanitizeLogValue(arg));

    const emitter = original[level] || original.log;
    emitter(...sanitizedArgs);
  };

  Object.keys(levelMap).forEach((level) => {
    console[level] = wrap(level);
  });

  window.__scopedConsoleInterceptorInstalled = true;
};

installConsoleInterceptors();

export default installConsoleInterceptors;
