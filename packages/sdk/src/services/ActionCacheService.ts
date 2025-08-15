export interface CachedActionStep {
  id: string;
  actionId: string;
  steps: Array<{
    type: string;
    elementId?: string;
    value?: string;
    url?: string;
    delay?: number;
  }>;
  transcript: string;
  completedAt: Date;
  successfulExecutions: number;
}

export interface ActionCacheRepository {
  save(cachedAction: CachedActionStep): Promise<void>;
  findByActionId(actionId: string): Promise<CachedActionStep[]>;
  findByTranscript(transcript: string): Promise<CachedActionStep[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

// localStorage implementation (current)
class LocalStorageRepository implements ActionCacheRepository {
  private readonly STORAGE_KEY = 'chant_action_cache';

  private getStoredActions(): CachedActionStep[] {
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

  private setStoredActions(actions: CachedActionStep[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(actions));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  async save(cachedAction: CachedActionStep): Promise<void> {
    const actions = this.getStoredActions();
    const existingIndex = actions.findIndex(a => a.id === cachedAction.id);
    
    if (existingIndex >= 0) {
      actions[existingIndex] = cachedAction;
    } else {
      actions.push(cachedAction);
    }
    
    this.setStoredActions(actions);
  }

  async findByActionId(actionId: string): Promise<CachedActionStep[]> {
    return this.getStoredActions().filter(a => a.actionId === actionId);
  }

  async findByTranscript(transcript: string): Promise<CachedActionStep[]> {
    const normalizedTranscript = transcript.toLowerCase().trim();
    return this.getStoredActions().filter(a => 
      a.transcript.toLowerCase().trim().includes(normalizedTranscript) ||
      normalizedTranscript.includes(a.transcript.toLowerCase().trim())
    );
  }

  async delete(id: string): Promise<void> {
    const actions = this.getStoredActions().filter(a => a.id !== id);
    this.setStoredActions(actions);
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// Database implementation (future)
class DatabaseRepository implements ActionCacheRepository {
  async save(cachedAction: CachedActionStep): Promise<void> {
    // TODO: Implement database save
    throw new Error('Database repository not implemented yet');
  }

  async findByActionId(actionId: string): Promise<CachedActionStep[]> {
    // TODO: Implement database query
    throw new Error('Database repository not implemented yet');
  }

  async findByTranscript(transcript: string): Promise<CachedActionStep[]> {
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
    actionId: string,
    steps: Array<{
      type: string;
      elementId?: string;
      value?: string;
      url?: string;
      delay?: number;
    }>,
    transcript: string
  ): Promise<void> {
    const id = `${actionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const cachedAction: CachedActionStep = {
      id,
      actionId,
      steps,
      transcript,
      completedAt: new Date(),
      successfulExecutions: 1
    };

    // Check if similar action already exists
    const existing = await this.repository.findByActionId(actionId);
    const similar = existing.find(a => 
      JSON.stringify(a.steps) === JSON.stringify(steps)
    );

    if (similar) {
      similar.successfulExecutions++;
      similar.completedAt = new Date();
      await this.repository.save(similar);
    } else {
      await this.repository.save(cachedAction);
    }
  }

  async findCachedSteps(actionId: string, transcript?: string): Promise<CachedActionStep[]> {
    if (transcript) {
      const transcriptMatches = await this.repository.findByTranscript(transcript);
      const actionMatches = await this.repository.findByActionId(actionId);
      
      // Prioritize transcript matches, then action matches
      const combined = [...transcriptMatches, ...actionMatches.filter(a => 
        !transcriptMatches.some(t => t.id === a.id)
      )];
      
      return combined.sort((a, b) => 
        b.successfulExecutions - a.successfulExecutions || 
        b.completedAt.getTime() - a.completedAt.getTime()
      );
    }
    
    const matches = await this.repository.findByActionId(actionId);
    return matches.sort((a, b) => 
      b.successfulExecutions - a.successfulExecutions || 
      b.completedAt.getTime() - a.completedAt.getTime()
    );
  }

  async hasCachedSteps(actionId: string): Promise<boolean> {
    const cached = await this.repository.findByActionId(actionId);
    return cached.length > 0;
  }

  async clearCache(): Promise<void> {
    await this.repository.clear();
  }

  async removeCachedAction(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}