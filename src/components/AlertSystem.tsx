import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
}

interface AlertContextType {
  alerts: Alert[];
  showAlert: (alert: Omit<Alert, 'id'>) => void;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const showAlert = (alert: Omit<Alert, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newAlert: Alert = {
      ...alert,
      id,
      duration: alert.duration ?? 5000,
      dismissible: alert.dismissible ?? true,
    };

    setAlerts(prev => [...prev, newAlert]);

    // Auto-dismiss after duration
    if (newAlert.duration && newAlert.duration > 0) {
      setTimeout(() => {
        dismissAlert(id);
      }, newAlert.duration);
    }
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  // Listen for global alert events
  React.useEffect(() => {
    const handleShowAlert = (event: CustomEvent) => {
      const { type, message } = event.detail;
      showAlert({
        type: type as AlertType,
        title: type === 'success' ? 'Éxito' : type === 'error' ? 'Error' : 'Información',
        message
      });
    };

    const handleClearAlerts = () => {
      clearAlerts();
    };

    window.addEventListener('showAlert', handleShowAlert as EventListener);
    window.addEventListener('clearAlerts', handleClearAlerts);

    return () => {
      window.removeEventListener('showAlert', handleShowAlert as EventListener);
      window.removeEventListener('clearAlerts', handleClearAlerts);
    };
  }, []);

  return (
    <AlertContext.Provider value={{ alerts, showAlert, dismissAlert, clearAlerts }}>
      {children}
      <AlertContainer />
    </AlertContext.Provider>
  );
};

const AlertContainer: React.FC = () => {
  const { alerts, dismissAlert } = useAlerts();

  const getAlertStyles = (type: AlertType) => {
    const baseStyles = "p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 ease-in-out transform";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-400 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-400 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-400 text-yellow-800`;
      case 'info':
        return `${baseStyles} bg-blue-50 border-blue-400 text-blue-800`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-400 text-gray-800`;
    }
  };

  const getIcon = (type: AlertType) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`${getAlertStyles(alert.type)} flex items-start space-x-3 animate-slide-in`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(alert.type)}
          </div>
          <div className="flex-1 min-w-0">
            {alert.title && (
              <h4 className="text-sm font-medium mb-1">{alert.title}</h4>
            )}
            <p className="text-sm">{alert.message}</p>
          </div>
          {alert.dismissible && (
            <button
              onClick={() => dismissAlert(alert.id)}
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cerrar alerta"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// Utility functions for common alert types
export const showSuccessAlert = (message: string, title?: string) => {
  const { showAlert } = useAlerts();
  showAlert({ type: 'success', title: title || 'Éxito', message });
};

export const showErrorAlert = (message: string, title?: string) => {
  const { showAlert } = useAlerts();
  showAlert({ type: 'error', title: title || 'Error', message });
};

export const showWarningAlert = (message: string, title?: string) => {
  const { showAlert } = useAlerts();
  showAlert({ type: 'warning', title: title || 'Advertencia', message });
};

export const showInfoAlert = (message: string, title?: string) => {
  const { showAlert } = useAlerts();
  showAlert({ type: 'info', title: title || 'Información', message });
}; 