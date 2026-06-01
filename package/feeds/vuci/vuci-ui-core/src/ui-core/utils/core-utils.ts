import { getCurrentInstance, isReactive, toRefs, useId, type Reactive } from 'vue'
import { isFunction } from './inspect'

export type UpdaterFn<TInput, TOutput = TInput> = (input: TInput) => TOutput

export type Updater<TInput, TOutput = TInput> = TOutput | UpdaterFn<TInput, TOutput>

/**
 *
 * @param updater - a function that receives `previousState` and returns next value, or just a value.
 * @param previousState - input argument if updater is a function.
 * @returns next state.
 */
export function resolveUpdater<TInput, TOutput = TInput>(updater: Updater<TInput, TOutput>, previousState: TInput): TOutput {
  return isFunction(updater) ? (updater as UpdaterFn<TInput, TOutput>)(previousState) : updater
}
/**
 * Automatically converts reactive object to refs, if its a reactive object
 * - if options object is reactive(), returns refs object each property
 * - else - just returns options object.
 * @example
 * // type of props can be:
 * // reactive({readonly: boolean})
 * // or {readonly:boolean}
 * // or {}
 * // or {readonly: ref(false)}
 * const {readonly = false} = resolveReactiveOptions(props)
 * // resolves the value, no matter if it's not defined, maybe ref or plain value.
 * console.log(toValue(readonly))
 */
export function resolveReactiveOptions<T extends object>(options: T) {
  return isReactive(options) ? toRefs(options as Reactive<T>) : options
}

let index = 1
export function getId() {
  if (getCurrentInstance()) {
    return useId()
  }
  return `t-${index++}`
}

/**
 * helper function to keep ids logic consistent across different components
 */
export function composeId(base: string, suffix: string) {
  return `${base}--${suffix}`
}
