import { type ActionStep, type Action, type ActionElement } from "../types";
import stringify from "fast-json-stable-stringify";

export interface CachedAction {
  cacheId: string;
  actionId: string;
  steps: ActionStep[];
  completedAt: Date;
  successfulExecutions: number;
}

export interface ActionCacheRepository {
  save(cachedAction: CachedAction): Promise<void>;
  findByCacheId(cacheId: string): Promise<CachedAction | undefined>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

// localStorage implementation (current)
class LocalStorageRepository implements ActionCacheRepository {
  private readonly STORAGE_KEY = 'chant_action_cache';

  private getStoredActions(): CachedAction[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data).map((item: any) => ({
        ...item,
        completedAt: new Date(item.completedAt)
      })) : [];
    } catch {
      return [];
    }
  }

  private setStoredActions(actions: CachedAction[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(actions));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  async save(cachedAction: CachedAction): Promise<void> {
    const actions = this.getStoredActions();
    const existingIndex = actions.findIndex(a => a.cacheId === cachedAction.cacheId);

    if (existingIndex >= 0) {
      actions[existingIndex] = cachedAction;
    } else {
      actions.push(cachedAction);
    }

    this.setStoredActions(actions);
  }

  async findByCacheId(cacheId: string): Promise<CachedAction | undefined> {
    return this.getStoredActions().find(a => a.cacheId === cacheId);
  }

  async delete(id: string): Promise<void> {
    const actions = this.getStoredActions().filter(a => a.cacheId !== id);
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
    throw new Error('Database repository not implemented yet');
  }

  async findByCacheId(cacheId: string): Promise<CachedAction | undefined> {
    // TODO: Implement database query
    throw new Error('Database repository not implemented yet');
  }

  async delete(id: string): Promise<void> {
    // TODO: Implement database delete
    throw new Error('Database repository not implemented yet');
  }

  async clear(): Promise<void> {
    // TODO: Implement database clear
    throw new Error('Database repository not implemented yet');
  }
}

export class ActionCacheService {
  private repository: ActionCacheRepository;

  constructor(useDatabase: boolean = false) {
    this.repository = useDatabase ? new DatabaseRepository() : new LocalStorageRepository();
  }

  async cacheSuccessfulAction(
    action: Action,
    actionElements: ActionElement[],
    steps: ActionStep[]
  ): Promise<void> {
    const cacheId = await getCacheId(action, actionElements);
    const existing = await this.repository.findByCacheId(cacheId);

    const cachedAction: CachedAction = {
      cacheId,
      actionId: action.actionId,
      steps,
      completedAt: new Date(),
      successfulExecutions: 1
    };

    if (existing) {
      existing.successfulExecutions++;
      existing.completedAt = new Date();
      await this.repository.save(existing);
    } else {
      await this.repository.save(cachedAction);
    }
  }

  async findCachedAction(action: Action, actionElements: ActionElement[] = []): Promise<CachedAction | undefined> {
    const cacheId = await getCacheId(action, actionElements);
    return await this.repository.findByCacheId(cacheId);
  }

  async hasCachedAction(cacheId: string): Promise<boolean> {
    const cached = await this.repository.findByCacheId(cacheId);
    return !!cached;
  }

  async clearCache(): Promise<void> {
    await this.repository.clear();
  }

  async removeCachedAction(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}

async function hashObject(obj: Record<string, any>) {
  const stableString = stringify(obj);
  const encoder = new TextEncoder();
  const data = encoder.encode(stableString);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

async function getCacheId(action: Action, actionElements: ActionElement[] = []) {
  let cacheId = action.actionId;
  if (action.cacheFunction) {
    const result = await action.cacheFunction(action.actionId, actionElements);
    const hash = await hashObject(result);
    cacheId = action.actionId + '-' + hash;
  }

  return cacheId;
}
