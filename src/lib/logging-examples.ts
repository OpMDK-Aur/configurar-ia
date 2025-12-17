// Ejemplos de uso del sistema de logging
// Este archivo contiene ejemplos de cómo implementar logging en diferentes escenarios

import { logger, generateRequestId } from './logger';

// Ejemplo 1: Endpoint básico con logging
export const exampleEndpoint = async (request: Request) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  logger.setRequestContext(requestId);
  
  try {
    logger.apiCall('example-endpoint', {
      url: request.url,
      method: request.method
    });
    
    // Lógica del endpoint aquí...
    
    const duration = Date.now() - startTime;
    logger.apiSuccess('example-endpoint', { duration, requestId });
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiError('example-endpoint', error instanceof Error ? error : new Error(String(error)), {
      duration,
      requestId
    });
    
    return new Response(JSON.stringify({ success: false }), { status: 500 });
  }
};

// Ejemplo 2: Operación con Airtable
export const exampleAirtableOperation = async () => {
  const startTime = Date.now();
  
  try {
    logger.airtableOperation('create', 'ExampleTable', {
      recordData: { field1: 'value1' }
    });
    
    // Operación de Airtable aquí...
    
    const duration = Date.now() - startTime;
    logger.performance('airtable-create', duration, {
      table: 'ExampleTable',
      recordId: 'rec_example123'
    });
    
    return { success: true };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error en operación de Airtable', {
      duration,
      table: 'ExampleTable'
    }, error instanceof Error ? error : undefined);
    
    return { success: false };
  }
};

// Ejemplo 3: Operación con OpenAI
export const exampleOpenAIOperation = async () => {
  const startTime = Date.now();
  
  try {
    logger.openaiOperation('create_completion', {
      model: 'gpt-4o-mini',
      promptLength: 100
    });
    
    // Operación de OpenAI aquí...
    
    const duration = Date.now() - startTime;
    logger.performance('openai-completion', duration, {
      model: 'gpt-4o-mini',
      tokensUsed: 150
    });
    
    return { success: true };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error en operación de OpenAI', {
      duration,
      model: 'gpt-4o-mini'
    }, error instanceof Error ? error : undefined);
    
    return { success: false };
  }
};

// Ejemplo 4: Validación con logging
export const exampleValidation = (data: any) => {
  const validationIssues: any[] = []; // Simular validación
  
  if (validationIssues.length > 0) {
    logger.validationError('example-validation', validationIssues, {
      dataFields: Object.keys(data)
    });
    return false;
  }
  
  logger.info('Validación exitosa', {
    dataFields: Object.keys(data)
  });
  
  return true;
};

// Ejemplo 5: Logging de rendimiento personalizado
export const examplePerformanceLogging = async (operation: string) => {
  const startTime = Date.now();
  
  try {
    // Operación costosa aquí...
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular operación
    
    const duration = Date.now() - startTime;
    
    // Log de rendimiento con umbrales
    if (duration > 5000) {
      logger.warn('Operación lenta detectada', {
        operation,
        duration,
        threshold: 5000
      });
    } else if (duration > 10000) {
      logger.error('Operación muy lenta', {
        operation,
        duration,
        threshold: 10000
      });
    } else {
      logger.performance(operation, duration, {
        operation,
        status: 'normal'
      });
    }
    
    return { success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error en operación', {
      operation,
      duration
    }, error instanceof Error ? error : undefined);
    
    return { success: false, duration };
  }
};

// Ejemplo 6: Logging de eventos de usuario
export const exampleUserActionLogging = (userId: string, action: string, context?: any) => {
  logger.userAction(action, {
    userId,
    action,
    timestamp: new Date().toISOString(),
    ...context
  });
};

// Ejemplo 7: Logging de debugging (solo en desarrollo)
export const exampleDebugLogging = (data: any) => {
  logger.debug('Información de debugging', {
    dataType: typeof data,
    dataKeys: Object.keys(data),
    dataSize: JSON.stringify(data).length
  });
};

// Ejemplo 8: Logging de errores con contexto detallado
export const exampleErrorLogging = (error: Error, context?: any) => {
  logger.error('Error detallado', {
    errorName: error.name,
    errorMessage: error.message,
    errorStack: error.stack?.split('\n').slice(0, 3), // Primeras 3 líneas del stack
    ...context
  }, error);
};

// Ejemplo 9: Logging de métricas de negocio
export const exampleBusinessMetrics = (metric: string, value: number, context?: any) => {
  logger.info(`Métrica de negocio: ${metric}`, {
    metric,
    value,
    timestamp: new Date().toISOString(),
    ...context
  });
};

// Ejemplo 10: Logging de seguridad
export const exampleSecurityLogging = (event: string, userId?: string, context?: any) => {
  logger.warn(`Evento de seguridad: ${event}`, {
    event,
    userId,
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
    timestamp: new Date().toISOString()
  });
}; 