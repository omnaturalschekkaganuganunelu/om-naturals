'use client';

import React from 'react';
import { useToastStore } from '@/store/toastStore';
import { X, CheckCircle2, AlertCircle, Info, ShoppingCart } from 'lucide-react';

export default function GlobalToast() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        let Icon = Info;
        let bgStyle = 'bg-white/95 border-amber-100/60 shadow-amber-900/5 text-amber-950';
        let iconContainerColor = 'bg-amber-50 border-amber-100 text-amber-700';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          bgStyle = 'bg-white/95 border-emerald-100/60 shadow-emerald-950/5 text-emerald-950';
          iconContainerColor = 'bg-emerald-50 border-emerald-100 text-emerald-600';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          bgStyle = 'bg-white/95 border-rose-100/60 shadow-rose-955/5 text-rose-950';
          iconContainerColor = 'bg-rose-50 border-rose-100 text-rose-600';
        } else if (toast.type === 'info') {
          Icon = Info;
          bgStyle = 'bg-white/95 border-blue-100/60 shadow-blue-955/5 text-blue-950';
          iconContainerColor = 'bg-blue-50 border-blue-100 text-blue-600';
        } else if (toast.type === 'cart') {
          Icon = ShoppingCart;
          bgStyle = 'bg-white/95 border-amber-200/60 shadow-amber-955/5 text-amber-950';
          iconContainerColor = 'bg-amber-100/60 border-amber-200 text-amber-800';
        }

        return (
          <div
            key={toast.id}
            className={`p-3.5 rounded-2xl shadow-xl border backdrop-blur-md pointer-events-auto flex items-start gap-3 transition-all duration-300 animate-slide-in-right ${bgStyle}`}
            role="alert"
          >
            <div className={`p-2 rounded-xl border flex-shrink-0 flex items-center justify-center ${iconContainerColor}`}>
              <Icon size={16} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              {toast.title && (
                <h4 className="text-xs font-black tracking-wide uppercase mb-0.5 opacity-90 leading-tight">
                  {toast.title}
                </h4>
              )}
              <p className="text-[11px] font-bold opacity-85 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 hover:bg-black/5 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
              aria-label="Close notification"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
