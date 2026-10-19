import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'A / B / C / D or 1 / 2 / 3 / 4', desc: 'Select corresponding answer option' },
    { key: 'N or ArrowRight', desc: 'Navigate to Next question' },
    { key: 'P or ArrowLeft', desc: 'Navigate to Previous question' },
    { key: 'M', desc: 'Mark or unmark question for review' },
    { key: 'E', desc: 'Toggle step-by-step explanation (Practice mode)' },
    { key: 'B', desc: 'Toggle bookmark for current question' },
    { key: 'Enter', desc: 'Submit selected answer' },
    { key: 'Esc', desc: 'Close dialogs / modals' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <Keyboard className="w-5 h-5 text-indigo-500" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex items-center justify-between text-xs sm:text-sm py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
              <span className="text-slate-600 dark:text-slate-300">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs border border-slate-300 dark:border-slate-700 shadow-xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
