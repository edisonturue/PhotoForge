/**
 * Renderer-side log helper.
 * Sends log entries to the main process via IPC, which writes them to disk.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const log = {
  debug: (module: string, msg: string, data?: any) => window.photoForge.logWrite('debug', module, msg, data),
  info: (module: string, msg: string, data?: any) => window.photoForge.logWrite('info', module, msg, data),
  warn: (module: string, msg: string, data?: any) => window.photoForge.logWrite('warn', module, msg, data),
  error: (module: string, msg: string, data?: any) => window.photoForge.logWrite('error', module, msg, data),

  /** Create a scoped logger for a component */
  module: (moduleName: string) => ({
    debug: (msg: string, data?: any) => window.photoForge.logWrite('debug', moduleName, msg, data),
    info: (msg: string, data?: any) => window.photoForge.logWrite('info', moduleName, msg, data),
    warn: (msg: string, data?: any) => window.photoForge.logWrite('warn', moduleName, msg, data),
    error: (msg: string, data?: any) => window.photoForge.logWrite('error', moduleName, msg, data),
  }),
};
