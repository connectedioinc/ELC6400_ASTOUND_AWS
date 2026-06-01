type Memorable<T> = {
  takeSnapshot: () => T // some state
  restoreSnapshot: (state: T) => void // same structure of state
}

export class Memento<T> {
  _memos: T[]
  _orig: Memorable<T>
  constructor(originator: Memorable<T>) {
    this._memos = []
    this._orig = originator
  }
  /**
   * @description Saves the originators current state.
   */
  save() {
    const state = this._orig.takeSnapshot()
    this._memos.push(state)
  }
  /**
   * @description restores the last saved state for the originator and removes it from the cache.
   */
  restore() {
    if (!this._memos.length) return
    const state = this._memos.pop()!
    this._orig.restoreSnapshot(state)
  }
  /**
   * @description clears out all mementos.
   */
  clear() {
    this._memos = []
  }
  /**
   * @description removes the latest saved memento from the mementos store without applying it.
   */
  pop() {
    this._memos.pop()
  }
}

export function useMementos<T>(originator: Memorable<T>) {
  const memos = new Memento(originator)
  return memos
}
