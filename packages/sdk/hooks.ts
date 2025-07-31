import { useEffect, useRef } from "react";
import {
  registerAction,
  registerElement,
  type ActionSchema,
  type VoiceElement,
} from ".";

export function useVoiceElement(id: string, meta: Omit<VoiceElement, "id" | "ref">) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    registerElement(id, { id, ...meta, ref });
  }, []);
  return ref;
}

export function useVoiceAction(id: string, action: ActionSchema) {
  useEffect(() => {
    registerAction(id, action);
  }, []);
}
