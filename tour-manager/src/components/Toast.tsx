"use client";

import { useEffect } from "react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

export type ToastType = "success" | "error";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type,
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl animate-slide-up ${
        type === "success" ? "bg-success text-theme" : "bg-error text-theme"
      }`}
    >
      {type === "success" ? (
        <CheckCircleIcon className="w-6 h-6 flex-shrink-0" />
      ) : (
        <XCircleIcon className="w-6 h-6 flex-shrink-0" />
      )}
      <span className="font-semibold">{message}</span>
    </div>
  );
}
