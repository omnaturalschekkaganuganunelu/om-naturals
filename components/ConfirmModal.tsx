'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X, Trash2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  iconType?: 'logout' | 'delete' | 'warning';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = false,
  iconType = 'logout',
}: ConfirmModalProps) {
  const { language } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all scale-100 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto ${
            isDestructive ? 'bg-red-50' : 'bg-amber-50'
          }`}>
            {iconType === 'delete' ? (
              <Trash2 className="text-red-500 w-6 h-6" />
            ) : iconType === 'warning' ? (
              <AlertTriangle className="text-amber-500 w-6 h-6" />
            ) : (
              <LogOut className="text-red-500 w-6 h-6 ml-1" />
            )}
          </div>
          <h3 className="text-xl font-black text-gray-900 text-center mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-500 text-center font-medium leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="flex items-center gap-3 p-5 pt-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl font-bold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all"
          >
            {cancelText || (language === 'te' ? 'రద్దు చేయి' : 'Cancel')}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm text-white active:scale-[0.98] transition-all shadow-md ${
              isDestructive
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                : 'bg-amber-800 hover:bg-amber-700 shadow-amber-800/20'
            }`}
          >
            {confirmText || (language === 'te' ? 'లాగ్ అవుట్' : 'Logout')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
