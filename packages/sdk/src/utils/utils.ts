import { type ActionHtmlElement, type ActionElement } from "../types";

export function getHtmlElement(elementId: string, htmlElements: ActionHtmlElement[]): HTMLElement | undefined {
  return htmlElements.find((el) => el.elementId === elementId)?.htmlElement
}
