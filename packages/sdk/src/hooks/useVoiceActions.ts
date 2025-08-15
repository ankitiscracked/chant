import { useEffect } from "react";
import { voiceEngine } from "../utils";
import type { Action } from "../types";

export function useVoiceActions(actions: Action[]) {
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
