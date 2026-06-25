'use client';

import React from 'react';
import { useToastStore } from '@/store/toastStore';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function GlobalToast() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let bgStyle = 'bg-gray-50 border-gray-200 text-gray-800';
        let iconColor = 'text-gray-500';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          bgStyle = 'bg-emerald-50 border-emerald-200 text-emerald-900';
          iconColor = 'text-emerald-500';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          bgStyle = 'bg-red-50 border-red-200 text-red-900';
          iconColor = 'text-red-500';
        } else if (toast.type === 'info') {
          Icon = Info;
          bgStyle = 'bg-amber-50 border-amber-200 text-amber-900';
          iconColor = 'text-amber-500';
        }

        return (
          <div
            key={toast.id}
            className={`p-3 rounded-2xl shadow-lg border pointer-events-auto flex items-start gap-3 animate-fade-in-up ${bgStyle}`}
          >
            <Icon size={18} className={`shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              {toast.title && <h4 className="text-xs font-black mb-0.5">{toast.title}</h4>}
              <p className="text-[11px] font-semibold opacity-90 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors"
            >
              <X size={14} className="opacity-60" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
