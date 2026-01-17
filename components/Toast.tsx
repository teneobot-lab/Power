import React, { useEffect } from 'react';
import { ToastMessage } from '../types';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    // Dipercepat menjadi 2500ms sesuai permintaan user
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 2500); 

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const getIcon = () => {
    const className = "w-5 h-5 glow-icon";
    switch (toast.type) {
      case 'success': return <CheckCircle className={`${className} text-emerald-400`} />;
      case 'error': return <XCircle className={`${className} text-rose-500`} />;
      case 'warning': return <AlertTriangle className={`${className} text-amber-400`} />;
      default: return <Info className={`${className} text-blue-400`} />;
    }
  };

  const getTheme = () => {
    switch (toast.type) {
      case 'success': return 'border-emerald-500/30 bg-slate-900/90 text-emerald-100';
      case 'error': return 'border-rose-500/30 bg-slate-900/90 text-rose-100';
      case 'warning': return 'border-amber-500/30 bg-slate-900/90 text-amber-100';
      default: return 'border-blue-500/30 bg-slate-900/90 text-blue-100';
    }
  };

  return (
    <div className={`pointer-events-auto flex items-start gap-4 p-4 rounded-xl border backdrop-blur-xl shadow-2xl max-w-sm w-80 animate-in slide-in-from-right duration-300 ${getTheme()}`}>
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <p className="text-sm font-semibold flex-1 tracking-tight">{toast.message}</p>
      <button 
        onClick={() => onRemove(toast.id)}
        className="text-slate-500 hover:text-slate-300 transition-colors p-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ToastContainer;