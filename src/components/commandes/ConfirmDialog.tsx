"use client";

import { ReactNode } from "react";
import { X, AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

type Props = {
  isOpen: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  loadingLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  icon?: "check" | "warning" | "send";
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
};

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  loadingLabel = "Veuillez patienter...",
  cancelLabel = "Retour",
  variant = "primary",
  icon = "check",
  loading = false,
  error,
  onConfirm,
  onClose,
  children,
}: Props) {
  useEscapeKey(onClose, isOpen && !loading);

  if (!isOpen) return null;

  const isDanger = variant === "danger";
  const Icon = icon === "warning" ? AlertTriangle : icon === "send" ? Send : CheckCircle2;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm p-6 bg-white rounded-3xl shadow-2xl text-center">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Fermer"
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={20} />
        </button>

        <div
          className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
            isDanger ? "bg-red-50 text-red-600" : "bg-emerald-50 text-[#1D6B45]"
          }`}
        >
          <Icon size={28} />
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>

        {description && (
          <div className="text-sm text-gray-500 mb-4 leading-relaxed">
            {description}
          </div>
        )}

        {children}

        {error && (
          <div className="p-3 mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3 text-sm font-bold text-white rounded-xl transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#1D6B45] hover:bg-[#155235]"
            }`}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
