"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface ModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  /** Rendered in a right-aligned row; put the primary action last. */
  actions: React.ReactNode;
  onClose(): void;
}

/** Token-styled confirmation/dialog overlay. Esc closes; backdrop click closes. */
export function Modal({ open, title, children, actions, onClose }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Move focus into the dialog so keyboard users land on the actions.
    const first = panelRef.current?.querySelector<HTMLElement>("button, [href], input, select");
    first?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ scale: 0.94, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="board-frame w-full max-w-sm rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-display text-xl text-[var(--gold)]">{title}</div>
            <div className="mt-2 text-sm text-[var(--ink-dim)]">{children}</div>
            <div className="mt-5 flex justify-end gap-3">{actions}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
