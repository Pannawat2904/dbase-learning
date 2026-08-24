"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Info, AlertCircle, CheckCircle2, X } from "lucide-react";

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info" | "success";
}

type DialogState = (ConfirmDialogOptions & {
  isOpen: boolean;
  resolve: (value: boolean) => void;
}) | null;

let globalSetDialog: ((state: DialogState) => void) | null = null;

export function confirmDialog(options: ConfirmDialogOptions | string): Promise<boolean> {
  const opts: ConfirmDialogOptions = typeof options === "string" ? { message: options } : options;
  return new Promise((resolve) => {
    if (globalSetDialog) {
      globalSetDialog({
        ...opts,
        isOpen: true,
        resolve,
      });
    } else {
      // Fallback if container not yet mounted
      const confirmed = window.confirm(opts.message);
      resolve(confirmed);
    }
  });
}

export function ConfirmDialogContainer() {
  const [dialog, setDialog] = useState<DialogState>(null);

  useEffect(() => {
    globalSetDialog = setDialog;
    return () => {
      globalSetDialog = null;
    };
  }, []);

  if (!dialog || !dialog.isOpen) return null;

  const handleConfirm = () => {
    dialog.resolve(true);
    setDialog(null);
  };

  const handleCancel = () => {
    dialog.resolve(false);
    setDialog(null);
  };

  const type = dialog.type || "warning";

  const getIcon = () => {
    switch (type) {
      case "danger":
        return <AlertCircle className="w-7 h-7 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-7 h-7 text-amber-500" />;
      case "success":
        return <CheckCircle2 className="w-7 h-7 text-emerald-500" />;
      case "info":
      default:
        return <Info className="w-7 h-7 text-blue-500" />;
    }
  };

  const getConfirmButtonClasses = () => {
    switch (type) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20";
      case "success":
        return "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20";
      case "info":
      default:
        return "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20";
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Icon + Close */}
        <div className="p-6 pb-0 flex items-start justify-between">
          <div className={`p-3.5 rounded-2xl ${
            type === 'danger' ? 'bg-red-50 dark:bg-red-950/40' :
            type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/40' :
            type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40' :
            'bg-blue-50 dark:bg-blue-950/40'
          }`}>
            {getIcon()}
          </div>
          <button
            onClick={handleCancel}
            aria-label="ปิดหน้าต่างยืนยัน"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-2">
          {dialog.title && (
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              {dialog.title}
            </h3>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {dialog.message}
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-2 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {dialog.cancelText || "ยกเลิก"}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${getConfirmButtonClasses()}`}
          >
            {dialog.confirmText || (type === "danger" ? "ยืนยันการลบ" : "ตกลง")}
          </button>
        </div>

      </div>
    </div>
  );
}
