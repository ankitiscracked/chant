import MiniSearch from "minisearch";
import {
  type ActionStep,
  type Action,
  type ActionElement,
  type CachedActionStep,
  type VariableElementSearchItem,
  type ActionHtmlElement,
} from "../types";
import _ from "lodash";

import ExecutionState from "../core/ExecutionState";

export interface CachedAction {
  actionId: string;
  steps: CachedActionStep[];
}

export interface ActionCacheRepository {
  save(cachedAction: CachedAction): Promise<void>;
  findByActionId(cacheId: string): Promise<CachedAction | undefined>;
  delete(actionId: string): Promise<void>;
  clear(): Promise<void>;
}

// localStorage implementation (current)
class LocalStorageRepository implements ActionCacheRepository {
  private readonly STORAGE_KEY = "chant_action_cache";

  private getStoredActions(): CachedAction[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data
        ? JSON.parse(data).map((item: any) => ({
          ...item,
          completedAt: new Date(item.completedAt),
        }))
        : [];
    } catch {
      return [];
    }
  }

  private setStoredActions(actions: CachedAction[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(actions));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }

  async save(cachedAction: CachedAction): Promise<void> {
    const actions = this.getStoredActions();
    const existingIndex = actions.findIndex(
      (a) => a.actionId === cachedAction.actionId
    );

    if (existingIndex >= 0) {
      actions[existingIndex] = cachedAction;
    } else {
      actions.push(cachedAction);
    }

    this.setStoredActions(actions);
  }

  async findByActionId(actionId: string): Promise<CachedAction | undefined> {
    return this.getStoredActions().find((a) => a.actionId === actionId);
  }

  async delete(actionId: string): Promise<void> {
    const actions = this.getStoredActions().filter(
      (a) => a.actionId !== actionId
    );
    this.setStoredActions(actions);
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// Database implementation (future)
class DatabaseRepository implements ActionCacheRepository {
  async save(cachedAction: CachedAction): Promise<void> {
    // TODO: Implement database save
    throw new Error("Database repository not implemented yet");
  }

  async findByActionId(cacheId: string): Promise<CachedAction | undefined> {
    // TODO: Implement database query
    throw new Error("Database repository not implemented yet");
  }

  async delete(id: string): Promise<void> {
    // TODO: Implement database delete
    throw new Error("Database repository not implemented yet");
  }

  async clear(): Promise<void> {
    // TODO: Implement database clear
    throw new Error("Database repository not implemented yet");
  }
}

export class ActionCacheService {
  private repository: ActionCacheRepository;

  constructor(useDatabase: boolean = false) {
    this.repository = useDatabase
      ? new DatabaseRepository()
      : new LocalStorageRepository();
  }

  async cacheSuccessfulAction(
    action: Action,
    actionElements: ActionElement[],
    executedSteps: ActionStep[]
  ): Promise<void> {
    const actionHtmlElements = ExecutionState.getHtmlElementsByAction(
      action.actionId
    );

    if (
      !validateElementsForCaching(
        action.actionId,
        executedSteps,
        actionElements,
        actionHtmlElements
      )
    ) {
      console.log("Skipping cahing for action", action.actionId);
      return;
    }

    const cachedSteps: CachedActionStep[] = executedSteps.map((step) => {
      const htmlElement = actionHtmlElements.find(
        (el) => el.elementId === step.elementId
      );
      const element = actionElements.find((el) => el.id === step.elementId);

      return {
        type: step.type,
        domElementId: htmlElement?.htmlElement.id!,
        isVariable: element?.isVariable || false,
        value: step.value
      };
    });

    // Step 3: Create cached action
    const cachedAction: CachedAction = {
      actionId: action.actionId,
      steps: cachedSteps,
    };

    // Step 4: Save to storage
    this.repository.save(cachedAction);
  }

  async findCachedAction(actionId: string): Promise<CachedAction | undefined> {
    return await this.repository.findByActionId(actionId);
  }

  async hasCachedAction(actionId: string): Promise<boolean> {
    const cached = await this.repository.findByActionId(actionId);
    return !!cached;
  }

  async clearCache(): Promise<void> {
    await this.repository.clear();
  }

  async removeCachedAction(actionId: string): Promise<void> {
    await this.repository.delete(actionId);
  }

  static async retrieveCachedAction(
    actionId: string,
    currentActionElements: ActionElement[],
    transcript: string
  ): Promise<ActionStep[] | null> {
    const actionCacheService = new ActionCacheService();
    const cachedAction = await actionCacheService.findCachedAction(actionId);

    const resolvedSteps: ActionStep[] = [];
    for (const step of cachedAction?.steps || []) {
      if (step.isVariable) {
        const variableElements = currentActionElements.filter(
          (el) => el.isVariable
        );
        const searchItems: VariableElementSearchItem[] = variableElements.map(
          (el) => ({
            elementId: el.id,
            searchableContent: buildSearchableContent(el),
            element: el,
          })
        );

        // Step 4: Initialize minisearch index
        const miniSearch = new MiniSearch({
          fields: ["searchableContent"],
          storeFields: ["elementId", "element"],
        });

        miniSearch.addAll(searchItems);
        const searchResults = miniSearch.search(transcript);

        if (searchResults.length === 0) {
          console.warn(
            `[Cache Warning] No suitable match found for variable element in action '${actionId}'. Falling back to LLM.`
          );
          return null;
        }

        const bestMatch = searchResults[0];
        resolvedSteps.push({
          type: step.type,
          elementId: bestMatch!.elementId,
          value: bestMatch!.element.value,
        });
      } else {
        resolvedSteps.push({
          type: step.type,
          domElementId: step.domElementId,
          value: step.value,
        });
      }
    }
    return resolvedSteps;
  }
}

function validateElementsForCaching(
  actionId: string,
  actionSteps: ActionStep[],
  actionElements: ActionElement[],
  actionHtlmElements: ActionHtmlElement[]
): boolean {
  const validHtmlElements = actionSteps
    .map((step) =>
      actionHtlmElements.find((el) => el.elementId === step.elementId)
    )
    .filter((el) => el !== undefined);

  const nonVariableElements = validHtmlElements.filter((el) => {
    const actionElement = actionElements.find((ae) => ae.id === el.elementId);
    return !actionElement?.isVariable;
  });

  if (
    nonVariableElements.some((el) => {
      !el.htmlElement.id;
    })
  ) {
    return false;
  }
  // Check 2: Non-variable elements must have unique IDs
  const nonVariableElementIds = nonVariableElements.map(
    (el) => el?.htmlElement.id
  );
  const uniqueActionElementIds = new Set(nonVariableElementIds);

  if (nonVariableElementIds.length !== uniqueActionElementIds.size) {
    console.warn(
      `[Cache Warning] Duplicate IDs found in non-variable elements for action '${actionId}'. Falling back to LLM.`
    );
    return false;
  }

  return true;
}

function buildSearchableContent(element: ActionElement): string {
  let content = element.label || "";

  if (element.metadata) {
    // Add metadata values to searchable content
    const metadataValues = Object.values(element.metadata)
      .filter((value) => typeof value === "string")
      .join(" ");
    content += " " + metadataValues;
  }

  return content.toLowerCase().trim();
}
