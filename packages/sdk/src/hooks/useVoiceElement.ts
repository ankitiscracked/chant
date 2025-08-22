import { nanoid } from "nanoid";
import { useEffect, useRef } from "react";
import { useVoiceEngine } from "../context/VoiceEngineContext";
import type { ActionElement } from "../types";
import Executionstate from "../core/ExecutionState";

export function useVoiceElement(
  actionId: string,
  { isVariable = false, ...rest }: Omit<ActionElement, "id" | "ref">
) {
  const voiceEngine = useVoiceEngine();
  const elementId = useRef(nanoid()).current;

  const ref = (element: HTMLElement | null) => {
    console.log("capturing element", elementId, element);
    if (!element) return;
    voiceEngine.captureHtmlElement(actionId, {
      elementId,
      htmlElement: element,
    });

    return () => {
    };
  };

  useEffect(() => {
    voiceEngine.registerElement(actionId, {
      id: elementId,
      isVariable,
      ...rest,
    });

    return () => {
      voiceEngine.unregisterElement(actionId, { id: elementId });
      voiceEngine.removeHtmlElement(actionId, elementId);
    };
  }, []);

  return ref;
}
