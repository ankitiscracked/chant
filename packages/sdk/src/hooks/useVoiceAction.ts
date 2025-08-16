import { useEffect } from "react";
import type { Action } from "../types";
import { useVoiceEngine } from "../context/VoiceEngineContext";

export function useVoiceAction(action: Action) {
  const voiceEngine = useVoiceEngine();
  useEffect(() => {
    voiceEngine.registerAction(action);
  }, []);
}
