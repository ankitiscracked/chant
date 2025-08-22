import type { ActionHtmlElement } from "../types";

class ExecutionState {
  private _resolve: () => void;
  private ready: Promise<void>;
  private htmlElementsByAction = new Map<string, ActionHtmlElement[]>();

  constructor() {
    this._resolve = () => {};
    this.ready = new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  done() {
    this._resolve();
  }

  reset() {
    this.ready = new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  async waitUntilReady() {
    return this.ready;
  }

  captureHtmlElement(actionId: string, actionHtmlElement: ActionHtmlElement) {
    const existing = this.htmlElementsByAction.get(actionId);
    if (existing?.some((el) => el.elementId === actionHtmlElement.elementId)) {
      console.log("element already captured, skipping");
      return;
    }

    this.htmlElementsByAction.set(actionId, [
      ...(existing || []),
      actionHtmlElement,
    ]);
    console.log("all captured elements: ", this.htmlElementsByAction);
  }

  getHtmlElementsByAction(actionId: string): ActionHtmlElement[] {
    return Array.from(this.htmlElementsByAction.get(actionId) || []);
  }

  removeHtmlElement(actionId: string, elementId: string) {
    const elements = this.htmlElementsByAction.get(actionId);
    if (!elements) return;

    const index = elements.findIndex((el) => el.elementId === elementId);
    if (index != -1) {
      elements.splice(index, 1);
    }
  }
}

const instance = new ExecutionState();

export default instance;
