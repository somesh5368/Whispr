import React from 'react';

function ChatsIcon({ img, name, title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-ws-surface-alt transition text-left"
    >
      <img
        src={img}
        alt={`${name}`}
        className="h-11 w-11 rounded-full object-cover border-2 border-ws-border flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-ws-text truncate">{name}</p>
        <p className="text-xs text-ws-text-muted truncate">{title || "I'm on Whispr"}</p>
      </div>
    </button>
  );
}

export default ChatsIcon;
