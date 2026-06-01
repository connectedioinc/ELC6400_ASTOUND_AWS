import { isFunction, isString } from './inspect'

export interface TimerOptions {
  /**
   * Periodically called function
   */
  method: (timer: Timer, iteration: number, elapsed: number) => void
  /**
   * Interval between function calls in milliseconds
   * @default 1000
   */
  time?: number
  /**
   * Initially run the function without any delay
   * @default false
   */
  immediate?: boolean
  /**
   * Start the timer as soon as it's registered
   * @default false
   */
  autostart?: boolean
  /**
   * Defines whether the timer should repeat or not (with setInterval or setTimeout)
   * @default true
   */
  repeat?: boolean
  /**
   * Group name for the timer, which can be used to start/stop all timers in the group
   * @default undefined
   */
  group?: string | string[]
}

export class Timer implements TimerOptions {
  method
  name
  time
  immediate
  autostart
  repeat
  group?
  isRunning = false

  private id?: number

  constructor(options: TimerOptions) {
    if (typeof options.method !== 'function') throw new Error(`[timer]: method property is not a function.`)
    this.method = options.method
    this.name = options.method.name.replace('bound ', '')
    this.time = options.time ?? 1000
    this.immediate = options.immediate ?? false
    this.autostart = options.autostart ?? false
    this.repeat = options.repeat ?? true
    this.group = options.group
    if (this.autostart) this.start()
    else this.autostart = true
  }

  start() {
    if (this.isRunning) return this
    this.isRunning = true
    let elapsed = this.immediate ? 0 : this.time
    let iteration = 0
    const awaitedFunc = async () => {
      if (!this.isRunning) return
      await this.method(this, iteration, elapsed)
      iteration++
      elapsed += this.time
      if (!this.repeat) {
        this.isRunning = false
        return
      }
      this.id = window.setTimeout(awaitedFunc, this.time)
    }
    this.id = window.setTimeout(awaitedFunc, this.immediate ? 0 : this.time)
    return this
  }

  stop() {
    if (!this.isRunning) return this
    window.clearTimeout(this.id)
    this.isRunning = false
    return this
  }

  restart() {
    this.stop()
    this.start()
    return this
  }
}

export class TimerController {
  private timers = new Map<string, Timer>()

  constructor(timers: TimerOptions[] = []) {
    for (const options of timers) {
      this.addTimer(options)
    }
  }

  private addTimer(options: TimerOptions) {
    const timer = new Timer(options)
    this.timers.set(timer.name, timer)
    return timer
  }

  private getTimerName(timerOptions: string | Function | TimerOptions) {
    if (isString(timerOptions)) return timerOptions
    if (isFunction(timerOptions)) return timerOptions.name.replace('bound ', '')
    return timerOptions.method.name.replace('bound ', '')
  }

  private getTimer(timerOptions: string | Function | TimerOptions) {
    const name = this.getTimerName(timerOptions)
    const timer = this.timers.get(name)
    return timer
  }

  private filterTimers(group?: string) {
    const timers = Array.from(this.timers.values())
    if (!group) return timers
    return timers.filter(timer => timer.group === group || (Array.isArray(timer.group) && timer.group.includes(group)))
  }

  start(timerOptions: string | Function | TimerOptions) {
    let timer = this.getTimer(timerOptions)
    if (!timer) {
      if (isString(timerOptions) || isFunction(timerOptions)) throw new Error(`[timer]: timer with name ${this.getTimerName(timerOptions)} does not exist.`)
      timer = this.addTimer(timerOptions)
      return
    }
    timer.start()
  }

  stop(name: string | Function) {
    const timer = this.getTimer(name)
    if (!timer) return
    timer.stop()
  }

  restart(name: string | Function) {
    const timer = this.getTimer(name)
    if (!timer) throw new Error(`[timer]: timer with name ${this.getTimerName(name)} does not exist.`)
    timer.restart()
  }

  startAll(group?: string) {
    const timers = this.filterTimers(group)
    timers.forEach(timer => timer.start())
  }

  stopAll(group?: string) {
    const timers = this.filterTimers(group)
    timers.forEach(timer => timer.stop())
  }

  destroyAll(group?: string) {
    this.stopAll(group)
    this.timers.clear()
  }
}
