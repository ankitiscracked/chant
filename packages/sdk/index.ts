import { createUserContent, GoogleGenAI } from "@google/genai";
export interface VoiceElement {
  id: string;
  selector: string;
  type: "input" | "button" | "link";
  label?: string;
  order?: number;
  value?: string;
  ref?: React.RefObject<HTMLElement>;
}

export interface ActionSchema {
  voice_triggers: string[];
  description: string;
  steps: string[]; // natural language
}

export interface Action {
  type: string;
  elementId?: string;
  value?: string;
  url?: string;
  delay?: number;
}

export interface ExecutionState {
  status: 'idle' | 'executing' | 'paused' | 'completed';
  currentActionIndex: number;
  pendingActions: Action[];
  waitingForElement?: {
    elementId: string;
    label?: string;
    reason: string;
  };
}

const elements = new Map<string, VoiceElement>();
const actions = new Map<string, ActionSchema>();
const context: Record<string, any> = {};

let executionState: ExecutionState = {
  status: 'idle',
  currentActionIndex: 0,
  pendingActions: [],
};

let stateChangeCallback: ((state: ExecutionState) => void) | null = null;

export function onExecutionStateChange(callback: (state: ExecutionState) => void) {
  stateChangeCallback = callback;
  return () => { stateChangeCallback = null; };
}

export function getExecutionState(): ExecutionState {
  return { ...executionState };
}

function updateExecutionState(updates: Partial<ExecutionState>) {
  executionState = { ...executionState, ...updates };
  if (stateChangeCallback) {
    stateChangeCallback(executionState);
  }
}

export function registerElement(id: string, meta: VoiceElement) {
  elements.set(id, meta);
}

export function registerAction(id: string, action: ActionSchema) {
  actions.set(id, action);
}

export function updateContext(obj: Record<string, any>) {
  Object.assign(context, obj);
}

function resolveIntent(transcript: string): string | undefined {
  console.log("Resolving intent for transcript:", transcript);
  console.log("Available actions:", Array.from(actions.keys()));

  for (const [id, action] of actions.entries()) {
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

class ActionDispatcher {
  private getElementRef(elementId: string): HTMLElement | null {
    const voiceElement = elements.get(elementId);
    if (!voiceElement?.ref?.current) return null;
    return voiceElement.ref.current;
  }

  private findNextRequiredInput(currentElement: HTMLElement): HTMLElement | null {
    const form = currentElement.closest('form');
    if (!form) return null;
    
    const formElements = Array.from(form.querySelectorAll('input, textarea, select')) as HTMLInputElement[];
    const requiredElements = formElements.filter(el => 
      el.hasAttribute('required') && !el.checkValidity()
    );
    
    return requiredElements[0] || null;
  }

  private getElementLabel(elementId: string): string {
    const voiceElement = elements.get(elementId);
    return voiceElement?.label || elementId;
  }

  resumeExecution() {
    if (executionState.status === 'paused' && executionState.pendingActions.length > 0) {
      updateExecutionState({ 
        status: 'executing', 
        waitingForElement: undefined 
      });
      this.executeActions(executionState.pendingActions);
    }
  }

  async executeActions(actions: Action[]) {
    console.log("Executing actions:", actions);
    updateExecutionState({ 
      status: 'executing', 
      currentActionIndex: 0, 
      pendingActions: actions 
    });
    
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      updateExecutionState({ currentActionIndex: i });
      
      try {
        console.log("Executing action:", action);
        const shouldPause = await this.executeAction(action);
        console.log("Action completed:", action);
        
        if (shouldPause) {
          const remainingActions = actions.slice(i + 1);
          updateExecutionState({ 
            status: 'paused', 
            pendingActions: remainingActions 
          });
          return;
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
    
    updateExecutionState({ 
      status: 'completed', 
      pendingActions: [],
      waitingForElement: undefined 
    });
  }

  private async executeAction(action: Action): Promise<boolean> {
    const element = action.elementId
      ? this.getElementRef(action.elementId)
      : null;
    console.log(`Action ${action.type} - Element found:`, element);

    switch (action.type) {
      case "click":
        if (element) {
          console.log("Clicking element:", element);
          element.click();
        } else {
          console.warn("No element found for click action");
        }
        break;

      case "setValue":
        if (element && action.value !== undefined) {
          console.log("Setting value:", action.value, "on element:", element);
          const input = element as HTMLInputElement;
          
          // Set the value using React's method
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(input, action.value);
          } else {
            input.value = action.value;
          }
          
          // Dispatch React's synthetic events
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          
          // Check if element is now valid or if there's a next required field
          if (input.hasAttribute('required') && !input.checkValidity()) {
            updateExecutionState({
              waitingForElement: {
                elementId: action.elementId!,
                label: this.getElementLabel(action.elementId!),
                reason: input.validationMessage || 'Field validation failed'
              }
            });
            return true; // Pause execution
          }
          
          // Check for next required field
          const nextRequired = this.findNextRequiredInput(input);
          if (nextRequired) {
            const nextElementId = Array.from(elements.entries())
              .find(([_, el]) => el.ref?.current === nextRequired)?.[0];
            
            if (nextElementId) {
              updateExecutionState({
                waitingForElement: {
                  elementId: nextElementId,
                  label: this.getElementLabel(nextElementId),
                  reason: 'Next required field needs input'
                }
              });
              nextRequired.focus();
              return true; // Pause execution
            }
          }
        } else {
          console.warn(
            "No element found for setValue action or no value provided"
          );
        }
        break;

      case "navigate":
        if (action.url) {
          console.log("Navigating to:", action.url);
          window.location.href = action.url;
        }
        break;

      case "focus":
        if (element) {
          console.log("Focusing element:", element);
          (element as HTMLElement).focus();
        } else {
          console.warn("No element found for focus action");
        }
        break;

      case "wait":
        if (action.delay) {
          console.log("Waiting for:", action.delay, "ms");
          await new Promise((resolve) => setTimeout(resolve, action.delay));
        }
        break;

      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
    
    return false; // Don't pause execution
  }
}

const dispatcher = new ActionDispatcher();

export async function transcribeAudio(audioBase64: string): Promise<string> {
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

async function generateActions(
  actionId: string,
  transcript: string
): Promise<Action[]> {
  const action = actions.get(actionId);
  const elementsData = Array.from(elements.values()).map((el) => ({
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

export async function handleTranscript(transcript: string) {
  console.log("handleTranscript called with:", transcript);
  
  // Check for resume commands when paused
  if (executionState.status === 'paused') {
    const resumeCommands = ['continue', 'next', 'resume', 'proceed'];
    if (resumeCommands.some(cmd => transcript.toLowerCase().includes(cmd))) {
      dispatcher.resumeExecution();
      return;
    }
  }
  
  const actionId = resolveIntent(transcript);

  if (!actionId) {
    console.log("No action ID found, returning early");
    return;
  }

  console.log("Generating actions for actionId:", actionId);
  try {
    const actions = await generateActions(actionId, transcript);
    console.log("Generated actions:", actions);
    await dispatcher.executeActions(actions);
    console.log("Actions executed successfully");
  } catch (e) {
    console.error("Error handling transcript:", e);
  }
}

export * from "./hooks";
export * from "./VoiceListener";
