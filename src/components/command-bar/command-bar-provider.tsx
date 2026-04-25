'use client';

import * as React from 'react';
import { CommandBar } from './command-bar';

/**
 * Global Command Bar state provider.
 *
 * Wraps the app and:
 *  1. Listens for Cmd+K (Mac) / Ctrl+K (Windows/Linux) keypress
 *  2. Opens the CommandBar dialog
 *  3. Provides an optional context so components can open it programmatically
 *     (e.g. a visible "quick search" button in the header)
 *
 * Why a provider and not a hook? The CommandBar dialog itself needs to render
 * somewhere in the tree, and we want it at the root so it's above all z-indexes.
 */

interface CommandBarContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CommandBarContext = React.createContext<CommandBarContextValue | null>(null);

export function useCommandBar() {
  const ctx = React.useContext(CommandBarContext);
  if (!ctx) throw new Error('useCommandBar must be used inside CommandBarProvider');
  return ctx;
}

export function CommandBarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((v) => !v), []);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toggle]);

  return (
    <CommandBarContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
      <CommandBar open={isOpen} onOpenChange={setIsOpen} />
    </CommandBarContext.Provider>
  );
}
