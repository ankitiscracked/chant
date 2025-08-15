import { useEffect } from 'react';
import { voiceEngine } from '../utils';
import type { Action } from '../types';

export function useVoiceAction(action: Action) {
  useEffect(() => {
    voiceEngine.registerAction(action);
  }, []);
}
