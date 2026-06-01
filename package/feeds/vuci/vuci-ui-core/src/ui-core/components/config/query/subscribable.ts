export class Subscribable<TArgs = any> {
  protected listeners: Set<(...args: TArgs[]) => void>

  constructor() {
    this.listeners = new Set()
  }

  notify(...args: TArgs[]) {
    this.listeners.forEach(listener => listener(...args))
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    this.onSubscribe()

    return () => this.unsubscribe(listener)
  }

  unsubscribe(listener: () => void) {
    this.listeners.delete(listener)
  }

  hasListeners(): boolean {
    return this.listeners.size > 0
  }

  protected onSubscribe(): void {
    // to be overridden by subclasses
  }

  protected onUnsubscribe(): void {
    // to be overridden by subclasses
  }
}
