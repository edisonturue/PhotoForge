import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  level: LogLevel;
  module: string;
  msg: string;
  data?: any;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
};

const RESET = '\x1b[0m';

/**
 * PhotoForge Logger
 *
 * - Writes structured JSON logs to disk: <libraryPath>/logs/
 * - Logs rotate daily; keeps last 7 days of logs
 * - Also prints to console with colors for dev mode
 * - Renderer sends logs via IPC → main process writes them
 */
export class Logger {
  private logDir: string;
  private minLevel: LogLevel = 'debug';
  private currentFileStream: fs.WriteStream | null = null;
  private currentDate: string = '';
  private maxLogFiles = 7;

  constructor(libraryPath: string) {
    this.logDir = path.join(libraryPath, 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    this.rotateLogs();
  }

  /** Set minimum log level (levels below this are discarded) */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /** Create a child logger scoped to a module name */
  module(moduleName: string): ModuleLogger {
    return new ModuleLogger(this, moduleName);
  }

  /** Core log method — called by ModuleLogger */
  log(level: LogLevel, module: string, msg: string, data?: any): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) return;

    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      module,
      msg,
      ...(data !== undefined ? { data } : {}),
    };

    // Console output (with colors)
    const color = LEVEL_COLORS[level];
    const prefix = `${color}[${entry.ts}][${level.toUpperCase()}][${module}]${RESET}`;
    if (data !== undefined) {
      console.log(prefix, msg, typeof data === 'object' ? JSON.stringify(data) : data);
    } else {
      console.log(prefix, msg);
    }

    // File output (JSON lines)
    this.writeToFile(JSON.stringify(entry));
  }

  /** Convenience shortcuts */
  debug(module: string, msg: string, data?: any): void { this.log('debug', module, msg, data); }
  info(module: string, msg: string, data?: any): void { this.log('info', module, msg, data); }
  warn(module: string, msg: string, data?: any): void { this.log('warn', module, msg, data); }
  error(module: string, msg: string, data?: any): void { this.log('error', module, msg, data); }

  /** Read log entries from the current or specified date */
  readLogs(date?: string, filter?: { level?: LogLevel; module?: string; search?: string }, limit: number = 500): LogEntry[] {
    const targetDate = date || this.todayStr();
    const logFile = this.logPath(targetDate);
    if (!fs.existsSync(logFile)) return [];

    const content = fs.readFileSync(logFile, 'utf-8');
    const entries: LogEntry[] = [];

    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry: LogEntry = JSON.parse(line);
        // Apply filters
        if (filter) {
          if (filter.level && LEVEL_PRIORITY[entry.level] < LEVEL_PRIORITY[filter.level]) continue;
          if (filter.module && entry.module !== filter.module) continue;
          if (filter.search) {
            const q = filter.search.toLowerCase();
            if (!entry.msg.toLowerCase().includes(q) &&
                !(entry.data && JSON.stringify(entry.data).toLowerCase().includes(q))) continue;
          }
        }
        entries.push(entry);
      } catch { /* skip malformed lines */ }
    }

    // Return most recent entries
    return entries.slice(-limit);
  }

  /** Get list of available log dates */
  getLogDates(): string[] {
    if (!fs.existsSync(this.logDir)) return [];
    return fs.readdirSync(this.logDir)
      .filter(f => f.startsWith('photoforge-') && f.endsWith('.log'))
      .map(f => f.replace('photoforge-', '').replace('.log', ''))
      .sort()
      .reverse();
  }

  /** Get the log file path on disk */
  getLogDir(): string {
    return this.logDir;
  }

  /** Clear all log files */
  clearLogs(): void {
    if (!fs.existsSync(this.logDir)) return;
    for (const f of fs.readdirSync(this.logDir)) {
      if (f.endsWith('.log')) {
        try { fs.unlinkSync(path.join(this.logDir, f)); } catch { /* */ }
      }
    }
  }

  // ===== Private =====

  private todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private logPath(date: string): string {
    return path.join(this.logDir, `photoforge-${date}.log`);
  }

  private writeToFile(line: string): void {
    const today = this.todayStr();
    if (today !== this.currentDate || !this.currentFileStream) {
      // Close old stream
      if (this.currentFileStream) {
        this.currentFileStream.end();
        this.currentFileStream = null;
      }
      this.currentDate = today;
      const logFile = this.logPath(today);
      this.currentFileStream = fs.createWriteStream(logFile, { flags: 'a' });
      this.currentFileStream.on('error', () => { /* silently ignore write errors */ });
    }
    this.currentFileStream.write(line + '\n');
  }

  private rotateLogs(): void {
    if (!fs.existsSync(this.logDir)) return;
    const files = fs.readdirSync(this.logDir)
      .filter(f => f.startsWith('photoforge-') && f.endsWith('.log'))
      .map(f => ({ name: f, time: fs.statSync(path.join(this.logDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    // Delete old log files beyond retention limit
    for (let i = this.maxLogFiles; i < files.length; i++) {
      try { fs.unlinkSync(path.join(this.logDir, files[i].name)); } catch { /* */ }
    }
  }
}

/**
 * Scoped logger for a specific module.
 * Usage: const log = logger.module('importer'); log.info('Importing file', { path });
 */
export class ModuleLogger {
  constructor(private logger: Logger, private moduleName: string) {}

  debug(msg: string, data?: any): void { this.logger.log('debug', this.moduleName, msg, data); }
  info(msg: string, data?: any): void { this.logger.log('info', this.moduleName, msg, data); }
  warn(msg: string, data?: any): void { this.logger.log('warn', this.moduleName, msg, data); }
  error(msg: string, data?: any): void { this.logger.log('error', this.moduleName, msg, data); }
}
