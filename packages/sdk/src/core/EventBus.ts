export class EventBus extends EventTarget {
  private static instance: EventBus;

  private constructor() {
    super();
  }

  static getInstance(): EventBus {
    if (!this.instance) {
      this.instance = new EventBus();
    }
    return this.instance;
  }

  static reset(): void {
    this.instance = new EventBus();
  }
}