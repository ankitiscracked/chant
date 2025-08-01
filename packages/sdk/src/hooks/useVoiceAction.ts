import { useEffect } from 'react';
import { voiceEngine } from '../utils';
import type { ActionSchema } from '../types';

export function useVoiceAction(id: string, action: ActionSchema) {
  useEffect(() => {
    voiceEngine.registerAction(id, action);
  }, [id, action.voice_triggers, action.description, action.steps]);
}