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

const ALLOW_INTERACTION_SELECTOR = '[data-allow-text-interaction="true"]';

function isAllowedInteractionTarget(event: Event) {
  const target = event.target;

  if (
    target instanceof Element &&
    target.closest(ALLOW_INTERACTION_SELECTOR)
  ) {
    return true;
  }

  const activeElement = document.activeElement;
  return (
    activeElement instanceof Element &&
    activeElement.closest(ALLOW_INTERACTION_SELECTOR)
  );
}

function blockEvent(event: Event) {
  if (isAllowedInteractionTarget(event)) return;

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
