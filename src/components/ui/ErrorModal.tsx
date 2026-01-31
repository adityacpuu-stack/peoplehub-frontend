import { useEffect } from 'react';
import { XCircle, X, AlertTriangle, WifiOff, ShieldX, RefreshCw } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'network';
  onRetry?: () => void;
}

export function ErrorModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'error',
  onRetry,
}: ErrorModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'network':
        return <WifiOff className="h-8 w-8 text-white" />;
      case 'warning':
        return <AlertTriangle className="h-8 w-8 text-white" />;
      default:
        return <ShieldX className="h-8 w-8 text-white" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'network':
        return 'bg-gradient-to-br from-gray-500 to-gray-600';
      case 'warning':
        return 'bg-gradient-to-br from-amber-500 to-orange-600';
      default:
        return 'bg-gradient-to-br from-red-500 to-rose-600';
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'network':
        return 'Connection Error';
      case 'warning':
        return 'Warning';
      default:
        return 'Login Failed';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 fade-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 pt-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 ${getIconBg()} rounded-full flex items-center justify-center shadow-lg`}>
              {getIcon()}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {getTitle()}
          </h3>

          {/* Message */}
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            )}
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 ${
                !onRetry ? 'w-full' : ''
              }`}
            >
              OK, Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
