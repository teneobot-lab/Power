import React, { useEffect } from 'react';
import { ToastMessage } from '../types';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-8 right-8 z-[9999] flex flex-col gap-4 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

// Fixed typo: Changed 'toastMessage' to 'ToastMessage' to resolve "Cannot find name 'toastMessage'" error
const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000); 

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const getIcon = () => {
    const className = "w-6 h-6";
    switch (toast.type) {
      case 'success': return <CheckCircle className={`${className} text-emerald-400`} />;
      case 'error': return <XCircle className={`${className} text-rose-500`} />;
      case 'warning': return <AlertTriangle className={`${className} text-amber-400`} />;
      default: return <Info className={`${className} text-blue-400`} />;
    }
  };

  const getTheme = () => {
    switch (toast.type) {
      case 'success': return 'border-emerald-500/20 bg-[#0f172a]/80 shadow-emerald-500/10';
      case 'error': return 'border-rose-500/20 bg-[#0f172a]/80 shadow-rose-500/10';
      case 'warning': return 'border-amber-500/20 bg-[#0f172a]/80 shadow-amber-500/10';
      default: return 'border-blue-500/20 bg-[#0f172a]/80 shadow-blue-500/10';
    }
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-5 p-5 rounded-3xl border backdrop-blur-2xl shadow-2xl max-w-sm w-96 animate-in slide-in-from-right-10 duration-500 ${getTheme()}`}>
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-widest text-slate-100">{toast.type}</p>
          <p className="text-xs font-bold text-slate-400 mt-1">{toast.message}</p>
      </div>
      <button 
        onClick={() => onRemove(toast.id)}
        className="text-slate-600 hover:text-white transition-colors p-2"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ToastContainer;