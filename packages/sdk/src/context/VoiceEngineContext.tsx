"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { VoiceEngine } from "../core/VoiceEngine";

interface VoiceEngineContextType {
  voiceEngine: VoiceEngine;
}

const VoiceEngineContext = createContext<VoiceEngineContextType | null>(null);

interface VoiceEngineProviderProps {
  children: ReactNode;
  voiceEngine: VoiceEngine;
}

export function VoiceEngineProvider({
  children,
  voiceEngine,
}: VoiceEngineProviderProps) {
  return (
    <VoiceEngineContext.Provider value={{ voiceEngine }}>
      {children}
    </VoiceEngineContext.Provider>
  );
}

export function useVoiceEngine(): VoiceEngine {
  const context = useContext(VoiceEngineContext);
  if (!context) {
    throw new Error("useVoiceEngine must be used within a VoiceEngineProvider");
  }
  return context.voiceEngine;
}
