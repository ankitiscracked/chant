import type { ActionStep, ActionElement, ExecutionState } from "../types";

interface ExecutionStateUpdater {
  updateExecutionState(updates: Partial<ExecutionState>): void;
}

export class ActionDispatcher {
  private elements: Map<string, ActionElement>;
  private stateUpdater: ExecutionStateUpdater;
  private getExecutionState: () => ExecutionState;

  constructor(elements: Map<string, ActionElement>, stateUpdater: ExecutionStateUpdater, getExecutionState: () => ExecutionState) {
    this.elements = elements;
    this.stateUpdater = stateUpdater;
    this.getExecutionState = getExecutionState;
  }

  private getElementRef(elementId: string): HTMLElement | null {
    const voiceElement = this.elements.get(elementId);
    if (!voiceElement?.ref?.current) return null;
    return voiceElement.ref.current;
  }

  private findNextRequiredInput(
    currentElement: HTMLElement
  ): HTMLElement | null {
    const form = currentElement.closest("form");
    if (!form) return null;

    const formElements = Array.from(
      form.querySelectorAll("input, textarea, select")
    ) as HTMLInputElement[];
    const requiredElements = formElements.filter(
      (el) => el.hasAttribute("required") && !el.checkValidity()
    );

    return requiredElements[0] || null;
  }

  private getElementLabel(elementId: string): string {
    const voiceElement = this.elements.get(elementId);
    return voiceElement?.label || elementId;
  }

  async executeActions(
    actions: ActionStep[],
    pauseOnRequiredField: boolean = false
  ): Promise<void> {
    console.log("Executing actions:", actions);

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      try {
        console.log("Executing action:", action);
        const pauseInfo = await this.executeAction(
          action,
          pauseOnRequiredField
        );
        console.log("Action completed:", action);

        if (pauseInfo) {
          const remainingActions = actions.slice(i + 1);
          this.stateUpdater.updateExecutionState({
            status: "paused",
            pausedAt: i,
            pendingActions: remainingActions,
            waitingForElement: pauseInfo,
          });
          return;
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.stateUpdater.updateExecutionState({
      status: "completed",
      pendingActions: [],
      waitingForElement: undefined,
    });

    // Dispatch event to trigger success dialog
    if (this.stateUpdater instanceof EventTarget) {
      (this.stateUpdater as EventTarget).dispatchEvent(
        new CustomEvent("actionsCompleted", {
          detail: { actions }
        })
      );
    }
  }

  private async executeAction(
    actionStep: ActionStep,
    pauseOnRequiredField: boolean
  ): Promise<{ elementId: string; label?: string; reason: string } | null> {
    const element = actionStep.elementId
      ? this.getElementRef(actionStep.elementId)
      : null;
    console.log(`Action ${actionStep.type} - Element found:`, element);

    // Check if we're in demo mode and this element affects persistent state
    const executionState = this.getExecutionState();
    const voiceElement = actionStep.elementId ? this.elements.get(actionStep.elementId) : null;
    
    if (executionState.isDemoMode && voiceElement?.affectsPersistentState) {
      console.log("Demo mode: executing demo handler for persistent state element");
      
      if (!voiceElement.demoHandler) {
        throw new Error(`Demo mode error: Element ${actionStep.elementId} affects persistent state but no demoHandler is provided`);
      }
      
      try {
        await voiceElement.demoHandler();
        console.log("Demo handler executed successfully");
        return null;
      } catch (error) {
        console.error("Demo handler execution failed:", error);
        throw error;
      }
    }

    switch (actionStep.type) {
      case "click":
        if (element) {
          console.log("Clicking element:", element);
          element.click();
        } else {
          console.warn("No element found for click action");
        }
        break;

      case "setValue":
        if (element && actionStep.value !== undefined) {
          console.log(
            "Setting value:",
            actionStep.value,
            "on element:",
            element
          );
          // Set the value using React's method - universal approach for all form elements
          try {
            const descriptor = Object.getOwnPropertyDescriptor(
              Object.getPrototypeOf(element),
              "value"
            );
            if (descriptor?.set) {
              descriptor.set.call(element, actionStep.value);
            } else {
              (element as any).value = actionStep.value;
            }
          } catch (error) {
            (element as any).value = actionStep.value;
          }

          // Dispatch React's synthetic events
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));

          // Check if element is now valid or if there's a next required field (only if pauseOnRequiredField is true)
          if (pauseOnRequiredField) {
            const formElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
            if (formElement.hasAttribute("required") && !formElement.checkValidity()) {
              return {
                elementId: actionStep.elementId!,
                label: this.getElementLabel(actionStep.elementId!),
                reason: formElement.validationMessage || "Field validation failed",
              };
            }

            // Check for next required field
            const nextRequired = this.findNextRequiredInput(formElement);
            if (nextRequired) {
              const nextElementId = Array.from(this.elements.entries()).find(
                ([_, el]) => el.ref?.current === nextRequired
              )?.[0];

              if (nextElementId) {
                nextRequired.focus();
                return {
                  elementId: nextElementId,
                  label: this.getElementLabel(nextElementId),
                  reason: "Next required field needs input",
                };
              }
            }
          }
        } else {
          console.warn(
            "No element found for setValue action or no value provided"
          );
        }
        break;

      case "navigate":
        if (actionStep.url) {
          console.log("Navigating to:", actionStep.url);
          window.location.href = actionStep.url;
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
        if (actionStep.delay) {
          console.log("Waiting for:", actionStep.delay, "ms");
          await new Promise((resolve) => setTimeout(resolve, actionStep.delay));
        }
        break;

      default:
        console.warn(`Unknown action type: ${actionStep.type}`);
    }

    return null; // Don't pause execution
  }
}
