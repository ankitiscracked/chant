import { useEffect } from "react";
import { useVoiceEngine } from "../context/VoiceEngineContext";
import type { Action } from "../types";

export function useVoiceActions(actions: Action[]) {
  const voiceEngine = useVoiceEngine();
  console.log("registering actions", actions);
  useEffect(() => {
    actions.forEach((action) => {
      voiceEngine.registerAction(action);
    });

    return () => {
      actions.forEach((action) => {
        voiceEngine.unregisterActions();
      });
    };
  }, []);
}
