"use client";
import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  isDestructive = false
}: ConfirmModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all border border-gray-100"
        dir="rtl"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={clsx(
                "p-2.5 rounded-2xl flex items-center justify-center",
                isDestructive ? "bg-red-50 text-red-600" : "bg-blue-50 text-indigo-600"
              )}>
                <AlertCircle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 pt-1">{title}</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-gray-600 mb-8 mt-2 text-[15px] leading-relaxed">
            {message}
          </p>
          
          <div className="flex flex-row-reverse items-center gap-3 w-full">
            <button
              onClick={() => {
                onClose();
                onConfirm();
              }}
              className={clsx(
                "flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all shadow-sm active:scale-95",
                isDestructive 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-[var(--accent)] hover:opacity-90"
              )}
            >
              {confirmText}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
