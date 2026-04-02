type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  service: string
  message: string
  [key: string]: unknown
}

const SERVICE = 'solver-engine'

function format(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE,
    message,
    ...meta,
  }
  return JSON.stringify(entry)
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    process.stdout.write(format('info', message, meta) + '\n')
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    process.stdout.write(format('warn', message, meta) + '\n')
  },
  error(message: string, meta?: Record<string, unknown>): void {
    process.stderr.write(format('error', message, meta) + '\n')
  },
  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.LOG_LEVEL === 'debug') {
      process.stdout.write(format('debug', message, meta) + '\n')
    }
  },
}
