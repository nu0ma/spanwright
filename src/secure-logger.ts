import { sanitizeErrorMessage } from './errors';

export interface LogLevel {
  readonly level: number;
  readonly name: string;
}

export const LOG_LEVELS = {
  ERROR: { level: 0, name: 'ERROR' },
  WARN: { level: 1, name: 'WARN' },
  INFO: { level: 2, name: 'INFO' },
  DEBUG: { level: 3, name: 'DEBUG' },
} as const;

export type LogLevelType = keyof typeof LOG_LEVELS;

export interface LogEntry {
  timestamp: string;
  level: LogLevelType;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
}

export class SecureLogger {
  private currentLevel: LogLevel;
  private isDevelopment: boolean;

  constructor(level: LogLevelType = 'INFO') {
    this.currentLevel = LOG_LEVELS[level];
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    return level.level <= this.currentLevel.level;
  }

  private formatMessage(level: LogLevelType, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    return `[${timestamp}] [${level}]${contextStr} ${message}`;
  }

  private sanitizeMessage(message: string): string {
    if (this.isDevelopment) {
      return message; // In development, show full messages
    }
    return sanitizeErrorMessage(message);
  }

  private createLogEntry(level: LogLevelType, message: string, context?: string, metadata?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message: this.sanitizeMessage(message),
      context,
      metadata: this.isDevelopment ? metadata : undefined, // Only include metadata in development
    };
  }

  error(message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LOG_LEVELS.ERROR)) return;
    
    const logEntry = this.createLogEntry('ERROR', message, context, metadata);
    const formattedMessage = this.formatMessage('ERROR', logEntry.message, context);
    
    console.error(formattedMessage);
    
    // In development, also log metadata if provided
    if (this.isDevelopment && metadata) {
      console.error('Metadata:', metadata);
    }
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LOG_LEVELS.WARN)) return;
    
    const logEntry = this.createLogEntry('WARN', message, context, metadata);
    const formattedMessage = this.formatMessage('WARN', logEntry.message, context);
    
    console.warn(formattedMessage);
    
    if (this.isDevelopment && metadata) {
      console.warn('Metadata:', metadata);
    }
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;
    
    const logEntry = this.createLogEntry('INFO', message, context, metadata);
    const formattedMessage = this.formatMessage('INFO', logEntry.message, context);
    
    console.log(formattedMessage);
    
    if (this.isDevelopment && metadata) {
      console.log('Metadata:', metadata);
    }
  }

  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;
    
    const logEntry = this.createLogEntry('DEBUG', message, context, metadata);
    const formattedMessage = this.formatMessage('DEBUG', logEntry.message, context);
    
    console.debug(formattedMessage);
    
    if (this.isDevelopment && metadata) {
      console.debug('Metadata:', metadata);
    }
  }

  logError(error: Error, context?: string): void {
    const errorMetadata = this.isDevelopment ? {
      name: error.name,
      stack: error.stack,
      cause: (error as any).cause,
    } : undefined;

    this.error(error.message, context, errorMetadata);
  }

  setLevel(level: LogLevelType): void {
    this.currentLevel = LOG_LEVELS[level];
  }

  getLevel(): LogLevelType {
    return Object.keys(LOG_LEVELS).find(
      key => LOG_LEVELS[key as LogLevelType].level === this.currentLevel.level
    ) as LogLevelType;
  }
}

// Global secure logger instance
export const secureLogger = new SecureLogger(
  process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO'
);

// Convenience functions for global usage
export const logError = (message: string, context?: string, metadata?: Record<string, any>) => 
  secureLogger.error(message, context, metadata);

export const logWarn = (message: string, context?: string, metadata?: Record<string, any>) => 
  secureLogger.warn(message, context, metadata);

export const logInfo = (message: string, context?: string, metadata?: Record<string, any>) => 
  secureLogger.info(message, context, metadata);

export const logDebug = (message: string, context?: string, metadata?: Record<string, any>) => 
  secureLogger.debug(message, context, metadata);

export const logException = (error: Error, context?: string) => 
  secureLogger.logError(error, context);