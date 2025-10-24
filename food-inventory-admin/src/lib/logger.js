const SENSITIVE_FIELD_PATTERN = /(password|token|secret|authorization|cookie|session)/i;

export const sanitizeLogValue = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    if (SENSITIVE_FIELD_PATTERN.test(value)) {
      return '[REDACTED]';
    }

    const normalized = value.trim();
    if (normalized.length > 120) {
      return `${normalized.slice(0, 117)}...`;
    }

    return normalized;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeLogValue);
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, nestedValue]) => {
      if (SENSITIVE_FIELD_PATTERN.test(key)) {
        acc[key] = '[REDACTED]';
      } else {
        acc[key] = sanitizeLogValue(nestedValue);
      }

      return acc;
    }, {});
  }

  return value;
};

const shouldLogLevel = (level) => {
  if (level === 'error' || level === 'warn') {
    return true;
  }

  return import.meta.env.DEV === true;
};

const consoleMethodMap = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

export const createScopedLogger = (scope = 'app') => {
  const emit = (level, message, metadata) => {
    if (!shouldLogLevel(level)) {
      return;
    }

    const method = consoleMethodMap[level] || 'log';
    const timestamp = new Date().toISOString();

    if (metadata !== undefined) {
      console[method](
        '[%s] [%s] %s',
        timestamp,
        scope,
        message,
        sanitizeLogValue(metadata),
      );
    } else {
      console[method](`[%s] [%s] %s`, timestamp, scope, message);
    }
  };

  return {
    debug: (message, metadata) => emit('debug', message, metadata),
    info: (message, metadata) => emit('info', message, metadata),
    warn: (message, metadata) => emit('warn', message, metadata),
    error: (message, metadata) => emit('error', message, metadata),
  };
};

export default createScopedLogger;
