import React, { useState, useEffect, useRef } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';

function MessageEditor({
  initialText = '',
  onSave,
  onCancel,
  isSaving = false,
  error = null,
}) {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef(null);

  // Auto-grow textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  // Focus and move cursor to end on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, []);

  const trimmed = text.trim();
  const isUnchanged = trimmed === initialText.trim();
  const isSaveDisabled = !trimmed || isUnchanged || isSaving;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSaveDisabled) {
        onSave(trimmed);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="w-full min-w-[220px] sm:min-w-[280px] max-w-full text-slate-800">
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-indigo-200/40 text-xs">
        <span className="font-semibold text-white/95 flex items-center gap-1.5 tracking-wide">
          Editing message
        </span>
        <span className="text-[10px] text-white/75 font-normal">
          Esc to cancel • Enter to save
        </span>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          rows={1}
          placeholder="Edit your message…"
          className="w-full text-sm text-slate-900 bg-white/95 rounded-xl px-3 py-2 border border-indigo-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-inner resize-none overflow-y-auto leading-relaxed"
        />
      </div>

      {error && (
        <p className="text-[11px] text-red-200 font-medium mt-1 leading-tight animate-in fade-in duration-150">
          ⚠️ {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 mt-2 pt-1 text-xs">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          title="Cancel (Esc)"
          aria-label="Cancel edit"
        >
          <FaTimes size={11} />
          <span>Cancel</span>
        </button>

        <button
          type="button"
          onClick={() => onSave(trimmed)}
          disabled={isSaveDisabled}
          className="px-3 py-1.5 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save (Enter)"
          aria-label="Save edited message"
        >
          {isSaving ? (
            <span className="w-3 h-3 border-2 border-indigo-600/40 border-t-indigo-600 rounded-full animate-spin" />
          ) : (
            <FaCheck size={11} />
          )}
          <span>{isSaving ? 'Saving…' : 'Save'}</span>
        </button>
      </div>
    </div>
  );
}

export default MessageEditor;
