import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class CustomLogger implements NestLoggerService {
  private formatMessage(level: string, message: string, context?: string): string {
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const emoji = this.getEmoji(level);
    const contextStr = context ? ` [${context}]` : '';
    
    return `${emoji} ${timestamp}${contextStr} ${level.toUpperCase()}: ${message}`;
  }

  private getEmoji(level: string): string {
    const emojis: Record<string, string> = {
      log: '📝',
      error: '❌',
      warn: '⚠️',
      debug: '🐛',
      verbose: '💬',
    };
    return emojis[level] || '📝';
  }

  log(message: string, context?: string) {
    console.log(this.formatMessage('log', message, context));
  }

  error(message: string, trace?: string, context?: string) {
    console.error(this.formatMessage('error', message, context));
    if (trace) {
      console.error('Stack trace:', trace);
    }
  }

  warn(message: string, context?: string) {
    console.warn(this.formatMessage('warn', message, context));
  }

  debug(message: string, context?: string) {
    console.debug(this.formatMessage('debug', message, context));
  }

  verbose(message: string, context?: string) {
    console.log(this.formatMessage('verbose', message, context));
  }
}
