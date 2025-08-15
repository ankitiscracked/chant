import { useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import { voiceEngine } from "../utils";
import type { ActionElement } from "../types";

export function useVoiceElement(
  actionId: string,
  element: Omit<ActionElement, "id" | "ref">
) {
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
