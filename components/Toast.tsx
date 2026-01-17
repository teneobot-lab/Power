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
      case 'success': return <CheckCircle className={`${className} text-[#22D3EE] glow-cyan`} />;
      case 'error': return <XCircle className={`${className} text-[#F97316]`} />;
      case 'warning': return <AlertTriangle className={`${className} text-amber-400`} />;
      default: return <Info className={`${className} text-[#6D5DF6] glow-purple`} />;
    }
  };

  const getTheme = () => {
    switch (toast.type) {
      case 'success': return 'border-[#22D3EE]/20 bg-[#0F172A]/80';
      case 'error': return 'border-[#F97316]/20 bg-[#0F172A]/80';
      case 'warning': return 'border-amber-500/20 bg-[#0F172A]/80';
      default: return 'border-[#6D5DF6]/20 bg-[#0F172A]/80';
    }
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-5 p-5 rounded-[1.5rem] border backdrop-blur-2xl shadow-2xl max-w-sm w-96 animate-in slide-in-from-right-10 duration-500 ${getTheme()}`}>
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">System {toast.type}</p>
          <p className="text-xs font-bold text-[#E5E7EB] mt-1.5">{toast.message}</p>
      </div>
      <button 
        onClick={() => onRemove(toast.id)}
        className="text-[#6B7280] hover:text-white transition-colors p-2"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ToastContainer;