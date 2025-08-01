import type { Action, ExecutionResult, VoiceElement } from '../types';

export class ActionDispatcher {
  private elements: Map<string, VoiceElement>;

  constructor(elements: Map<string, VoiceElement>) {
    this.elements = elements;
  }

  private getElementRef(elementId: string): HTMLElement | null {
    const voiceElement = this.elements.get(elementId);
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
    const voiceElement = this.elements.get(elementId);
    return voiceElement?.label || elementId;
  }

  async executeActions(actions: Action[]): Promise<ExecutionResult> {
    console.log("Executing actions:", actions);
    
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      
      try {
        console.log("Executing action:", action);
        const pauseInfo = await this.executeAction(action);
        console.log("Action completed:", action);
        
        if (pauseInfo) {
          const remainingActions = actions.slice(i + 1);
          return {
            completed: false,
            pausedAt: i,
            remainingActions,
            waitingForElement: pauseInfo
          };
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
    
    return { completed: true };
  }

  private async executeAction(action: Action): Promise<{elementId: string; label?: string; reason: string} | null> {
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
            return {
              elementId: action.elementId!,
              label: this.getElementLabel(action.elementId!),
              reason: input.validationMessage || 'Field validation failed'
            };
          }
          
          // Check for next required field
          const nextRequired = this.findNextRequiredInput(input);
          if (nextRequired) {
            const nextElementId = Array.from(this.elements.entries())
              .find(([_, el]) => el.ref?.current === nextRequired)?.[0];
            
            if (nextElementId) {
              nextRequired.focus();
              return {
                elementId: nextElementId,
                label: this.getElementLabel(nextElementId),
                reason: 'Next required field needs input'
              };
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
    
    return null; // Don't pause execution
  }
}