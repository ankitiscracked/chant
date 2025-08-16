import { nanoid } from "nanoid";
import { useEffect, useRef } from "react";
import { useVoiceEngine } from "../context/VoiceEngineContext";
import type { ActionElement } from "../types";

export function useVoiceElement(
  actionId: string,
  element: Omit<ActionElement, "id" | "ref">
) {
  const voiceEngine = useVoiceEngine();
  const ref = useRef<HTMLElement>(null);
  const elementId = useRef(nanoid()).current;

  useEffect(() => {
    voiceEngine.registerElement(actionId, {
      ...element,
      id: elementId,
      ref,
    });

    return () => {
      voiceEngine.unregisterElement(actionId, { id: elementId });
    };
  }, []);

  return ref;
}
