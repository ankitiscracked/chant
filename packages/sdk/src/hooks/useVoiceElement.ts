import { useEffect, useRef } from 'react';
import { voiceEngine } from '../utils';
import type { VoiceElement } from '../types';

export function useVoiceElement(id: string, element: Omit<VoiceElement, 'id' | 'ref'>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    voiceEngine.registerElement(id, {
      ...element,
      id,
      ref
    });
  }, [id, element.selector, element.type, element.label, element.order, element.value]);

  return ref;
}