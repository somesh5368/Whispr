import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FaChevronDown, FaPencilAlt, FaRegCopy, FaTrash, FaCheck } from 'react-icons/fa';

function MessageActions({
  message,
  canEdit = false,
  isOpen = false,
  onToggle,
  onClose,
  onStartEdit,
  onDelete,
}) {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, openUp: false });
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  // Resize listener to track mobile breakpoint
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate popover coordinates on desktop
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || isMobile) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = canEdit ? 140 : 100;
    const menuWidth = 175;

    // Check if enough room below
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight && rect.top > menuHeight;

    const top = openUp ? rect.top - menuHeight - 4 : rect.bottom + 4;
    // Align with trigger's right edge, but keep within viewport
    let left = rect.right - menuWidth;
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }

    setPopoverPosition({ top, left, openUp });
  }, [canEdit, isMobile]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  // Close on outside click, scroll, and Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (
        triggerRef.current &&
        triggerRef.current.contains(e.target)
      ) {
        return;
      }
      if (menuRef.current && menuRef.current.contains(e.target)) {
        return;
      }
      onClose();
    };

    const handleScroll = () => {
      onClose();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        triggerRef.current?.focus();
        return;
      }

      // Keyboard arrow navigation
      if (!menuRef.current) return;
      const items = Array.from(
        menuRef.current.querySelectorAll('[role="menuitem"]:not([disabled])')
      );
      const currentIndex = items.indexOf(document.activeElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev]?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus first menu item on open
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstItem = menuRef.current.querySelector('[role="menuitem"]:not([disabled])');
      firstItem?.focus();
    }
  }, [isOpen]);

  const handleCopy = useCallback(async () => {
    const textToCopy = message.message || '';
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to copy message:', err);
      onClose();
    }
  }, [message, onClose]);

  const handleEditClick = useCallback(() => {
    onClose();
    onStartEdit(message);
  }, [message, onClose, onStartEdit]);

  const handleDeleteClick = useCallback(() => {
    onClose();
    onDelete(message);
  }, [message, onClose, onDelete]);

  const renderMenuItems = (itemClassName, iconSize = 13) => (
    <>
      {canEdit && (
        <button
          type="button"
          role="menuitem"
          onClick={handleEditClick}
          className={itemClassName}
        >
          <FaPencilAlt size={iconSize} className="text-slate-500 group-hover:text-indigo-600 transition" />
          <span>Edit</span>
        </button>
      )}

      <button
        type="button"
        role="menuitem"
        onClick={handleCopy}
        className={itemClassName}
      >
        {copied ? (
          <FaCheck size={iconSize} className="text-emerald-600" />
        ) : (
          <FaRegCopy size={iconSize} className="text-slate-500 group-hover:text-indigo-600 transition" />
        )}
        <span className={copied ? 'text-emerald-600 font-semibold' : ''}>
          {copied ? 'Copied!' : 'Copy'}
        </span>
      </button>

      <div className="border-t border-slate-100 my-1" />

      <button
        type="button"
        role="menuitem"
        onClick={handleDeleteClick}
        className={`${itemClassName} text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700`}
      >
        <FaTrash size={iconSize} className="text-red-500 group-hover:text-red-700 transition" />
        <span>Delete</span>
      </button>
    </>
  );

  return (
    <>
      {/* Trigger: 28px hit area, soft circular background, visible on hover desktop, always visible mobile */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="w-7 h-7 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/25 active:bg-black/35 text-white/90 hover:text-white transition-all shadow-xs cursor-pointer opacity-85 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/40"
        aria-label="Message actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <FaChevronDown size={10} className={`transform transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Mobile Bottom Sheet */}
      {isOpen && isMobile && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={onClose}
          role="presentation"
        >
          <div
            ref={menuRef}
            role="menu"
            aria-label="Message actions"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-2xl shadow-elevated border-t border-ws-border p-4 text-slate-800 animate-in slide-in-from-bottom duration-200"
          >
            {/* Drag handle look */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />

            <div className="flex flex-col gap-1">
              {renderMenuItems(
                'group w-full flex items-center gap-3.5 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 rounded-xl transition cursor-pointer',
                15
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full mt-2 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Desktop Anchored Popover Card */}
      {isOpen && !isMobile && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="Message actions"
          style={{
            position: 'fixed',
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
            width: '172px',
          }}
          onClick={(e) => e.stopPropagation()}
          className="z-50 bg-white rounded-xl shadow-elevated border border-ws-border py-1.5 text-slate-700 animate-in fade-in zoom-in-95 duration-120"
        >
          {renderMenuItems(
            'group w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-600 focus:bg-indigo-50/80 focus:text-indigo-600 focus:outline-none transition cursor-pointer'
          )}
        </div>,
        document.body
      )}
    </>
  );
}

export default MessageActions;
