import { GoogleGenAI } from "@google/genai";
import type { VoiceElement, ActionSchema, Action, ExecutionState } from '../types';
import { ActionDispatcher } from './ActionDispatcher';

export class VoiceEngine {
  private elements = new Map<string, VoiceElement>();
  private actions = new Map<string, ActionSchema>();
  private context: Record<string, any> = {};
  private executionState: ExecutionState = {
    status: 'idle',
    currentActionIndex: 0,
    pendingActions: [],
  };
  private stateChangeCallback: ((state: ExecutionState) => void) | null = null;
  private dispatcher: ActionDispatcher;

  constructor() {
    this.dispatcher = new ActionDispatcher(
      this.elements,
      this.executionState,
      this.stateChangeCallback
    );
  }

  // State management
  onExecutionStateChange(callback: (state: ExecutionState) => void) {
    this.stateChangeCallback = callback;
    return () => { this.stateChangeCallback = null; };
  }

  getExecutionState(): ExecutionState {
    return { ...this.executionState };
  }

  private updateExecutionState(updates: Partial<ExecutionState>) {
    this.executionState = { ...this.executionState, ...updates };
    if (this.stateChangeCallback) {
      this.stateChangeCallback(this.executionState);
    }
  }

  // Registration methods
  registerElement(id: string, meta: VoiceElement) {
    this.elements.set(id, meta);
  }

  registerAction(id: string, action: ActionSchema) {
    this.actions.set(id, action);
  }

  updateContext(obj: Record<string, any>) {
    Object.assign(this.context, obj);
  }

  // Intent resolution
  private resolveIntent(transcript: string): string | undefined {
    console.log("Resolving intent for transcript:", transcript);
    console.log("Available actions:", Array.from(this.actions.keys()));

    for (const [id, action] of this.actions.entries()) {
      console.log(`Checking action ${id} with triggers:`, action.voice_triggers);
      if (
        action.voice_triggers.some((t) =>
          transcript.toLowerCase().includes(t.toLowerCase())
        )
      ) {
        console.log(`Match found: ${id}`);
        return id;
      }
    }
    console.log("No matching action found");
    return undefined;
  }

  // Transcription
  async transcribeAudio(audioBase64: string): Promise<string> {
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error("VITE_GEMINI_API_KEY environment variable is required");
    }

    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          text: "Please transcribe this audio to text. Return only the transcribed text, no other formatting or explanation.",
        },
        { inlineData: { mimeType: "audio/wav", data: audioBase64 } },
      ],
    });

    const transcript = response.text;

    if (!transcript) {
      throw new Error("No transcription received from Gemini API");
    }

    return transcript.trim().toLowerCase();
  }

  // Action generation
  private async generateActions(
    actionId: string,
    transcript: string
  ): Promise<Action[]> {
    const action = this.actions.get(actionId);
    const elementsData = Array.from(this.elements.values()).map((el) => ({
      id: el.id,
      type: el.type,
      label: el.label,
      selector: el.selector,
      value: el.ref?.current
        ? (el.ref.current as HTMLInputElement).value || ""
        : "",
    }));

    const prompt = `
You are a voice automation assistant. Generate a JSON array of actions to accomplish the user's voice command.

Voice command: "${transcript}"
Action description: "${action?.description}"
Steps: ${action?.steps?.join(", ")}
Available elements: ${JSON.stringify(elementsData)}

Return ONLY a JSON array of actions with this format:
[
  {"type": "setValue", "elementId": "element-id", "value": "text to enter"},
  {"type": "click", "elementId": "element-id"},
  {"type": "wait", "delay": 1000}
]

Supported action types: setValue, click, focus, wait, navigate
`;

    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error("VITE_GEMINI_API_KEY environment variable is required");
    }

    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const generatedText = response.text;

    if (!generatedText) {
      throw new Error("No response from Gemini API");
    }

    try {
      const cleanedText = generatedText.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleanedText);
    } catch (e) {
      console.error("Failed to parse Gemini response:", generatedText);
      throw new Error("Invalid JSON response from Gemini API");
    }
  }

  // Main transcript handling
  async handleTranscript(transcript: string) {
    console.log("handleTranscript called with:", transcript);
    
    // Check for resume commands when paused
    if (this.executionState.status === 'paused') {
      const resumeCommands = ['continue', 'next', 'resume', 'proceed'];
      if (resumeCommands.some(cmd => transcript.toLowerCase().includes(cmd))) {
        this.dispatcher.resumeExecution();
        return;
      }
    }
    
    const actionId = this.resolveIntent(transcript);

    if (!actionId) {
      console.log("No action ID found, returning early");
      return;
    }

    console.log("Generating actions for actionId:", actionId);
    try {
      const actions = await this.generateActions(actionId, transcript);
      console.log("Generated actions:", actions);
      await this.dispatcher.executeActions(actions);
      console.log("Actions executed successfully");
    } catch (e) {
      console.error("Error handling transcript:", e);
    }
  }
}