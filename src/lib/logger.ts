// Sistema de logging estructurado para Vercel
// Este logger está optimizado para el despliegue en Vercel y proporciona
// logs estructurados que aparecen en la consola de Vercel

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: LogContext;
  error?: Error;
  requestId?: string | null;
  userId?: string | null;
  action?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private requestId: string | null = null;
  private userId: string | null = null;

  setRequestContext(requestId: string, userId?: string) {
    this.requestId = requestId;
    this.userId = userId || null;
  }

  private formatLog(level: LogEntry['level'], message: string, context?: LogContext, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      requestId: this.requestId,
      userId: this.userId,
    };
  }

  private output(entry: LogEntry) {
    // En desarrollo, mostrar logs más detallados
    if (this.isDevelopment) {
      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
      console.log(`${prefix} ${entry.message}`);
      
      if (entry.context && Object.keys(entry.context).length > 0) {
        console.log(`${prefix} Context:`, entry.context);
      }
      
      if (entry.error) {
        console.error(`${prefix} Error:`, entry.error);
      }
    } else {
      // En producción, usar JSON estructurado para Vercel
      console.log(JSON.stringify(entry));
    }
  }

  info(message: string, context?: LogContext) {
    this.output(this.formatLog('info', message, context));
  }

  warn(message: string, context?: LogContext) {
    this.output(this.formatLog('warn', message, context));
  }

  error(message: string, context?: LogContext, error?: Error) {
    this.output(this.formatLog('error', message, context, error));
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.output(this.formatLog('debug', message, context));
    }
  }

  // Métodos específicos para acciones comunes
  apiCall(action: string, context?: LogContext) {
    this.info(`API Call: ${action}`, context);
  }

  apiSuccess(action: string, context?: LogContext) {
    this.info(`API Success: ${action}`, context);
  }

  apiError(action: string, error: Error, context?: LogContext) {
    this.error(`API Error: ${action}`, context, error);
  }

  validationError(action: string, issues: any[], context?: LogContext) {
    this.warn(`Validation Error: ${action}`, { ...context, issues });
  }

  airtableOperation(operation: string, table: string, context?: LogContext) {
    this.info(`Airtable ${operation}: ${table}`, context);
  }

  openaiOperation(operation: string, context?: LogContext) {
    this.info(`OpenAI ${operation}`, context);
  }

  userAction(action: string, context?: LogContext) {
    this.info(`User Action: ${action}`, context);
  }

  performance(operation: string, duration: number, context?: LogContext) {
    this.info(`Performance: ${operation} took ${duration}ms`, context);
  }
}

// Instancia global del logger
export const logger = new Logger();

// Función helper para generar request IDs únicos
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Middleware para Astro que agrega logging a las requests
export function withLogging(handler: Function) {
  return async (context: any) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    // Configurar contexto del logger
    logger.setRequestContext(requestId);
    
    try {
      logger.apiCall(`${context.request.method} ${context.request.url}`, {
        url: context.request.url,
        method: context.request.method,
        userAgent: context.request.headers.get('user-agent'),
      });
      
      const result = await handler(context);
      
      const duration = Date.now() - startTime;
      logger.apiSuccess(`${context.request.method} ${context.request.url}`, {
        duration,
        status: result?.status || 200,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.apiError(`${context.request.method} ${context.request.url}`, 
        error instanceof Error ? error : new Error(String(error)), {
        duration,
      });
      
      throw error;
    }
  };
} 