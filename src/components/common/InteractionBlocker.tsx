'use client';

import { useEffect } from 'react';

const BLOCKED_SHORTCUTS = new Set([
  'a',
  'c',
  'i',
  'j',
  'p',
  's',
  'u',
  'v',
  'x',
]);

function blockEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}

export default function InteractionBlocker() {
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const key = event.key?.toLowerCase() || '';
      const hasModifier = event.ctrlKey || event.metaKey;

      if (
        (hasModifier && BLOCKED_SHORTCUTS.has(key)) ||
        event.key === 'F12'
      ) {
        blockEvent(event);
      }
    };

    document.addEventListener('contextmenu', blockEvent, true);
    document.addEventListener('copy', blockEvent, true);
    document.addEventListener('cut', blockEvent, true);
    document.addEventListener('paste', blockEvent, true);
    document.addEventListener('selectstart', blockEvent, true);
    document.addEventListener('dragstart', blockEvent, true);
    document.addEventListener('keydown', handleKeyboard, true);

    return () => {
      document.removeEventListener('contextmenu', blockEvent, true);
      document.removeEventListener('copy', blockEvent, true);
      document.removeEventListener('cut', blockEvent, true);
      document.removeEventListener('paste', blockEvent, true);
      document.removeEventListener('selectstart', blockEvent, true);
      document.removeEventListener('dragstart', blockEvent, true);
      document.removeEventListener('keydown', handleKeyboard, true);
    };
  }, []);

  return null;
}
