"use client";

import { createContext, useContext, useRef } from "react";

type ScrollContextType = {
  emitScroll: (delta: number) => void;
  subscribe: (fn: (delta: number) => void) => () => void;
};

const ScrollContext = createContext<ScrollContextType | null>(null);

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const listeners = useRef(new Set<(delta: number) => void>());

  const emitScroll = (delta: number) => {
    listeners.current.forEach((fn) => fn(delta));
  };

  const subscribe = (fn: (delta: number) => void) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  };

  return (
    <ScrollContext.Provider value={{ emitScroll, subscribe }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScrollBus() {
  const ctx = useContext(ScrollContext);
  if (!ctx) throw new Error("useScrollBus must be inside ScrollProvider");
  return ctx;
}
