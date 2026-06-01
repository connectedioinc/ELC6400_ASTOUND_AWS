import type { StatusObject } from '@/components/shared/BasicStatus.vue'
import type { OptionHint } from '@/components/shared/HintHelper.vue'
import { computed, toRef, type MaybeRef } from 'vue'

export type ValueOption<T = string> = {
  /** value in the API */
  value: T
  /** Name(pretty key) of the value */
  name: string
  /** Explanation what this value does */
  help: string
  /** Unused var for this option type */
  exampleValue?: never
  /** Should option be shown as selectable option */
  depend?: boolean
  /** How this value should he displayed in status. Most times leave this undefined. */
  type?: StatusObject['type']
}

function _useOptions<K extends ValueOption<T> | CustomOption, T = string>(rawOptions: MaybeRef<K[]>) {
  const options = toRef(rawOptions)

  /** Use this for options param in select input */
  const inputOptions = computed(() => {
    return options.value.filter(option => option.value !== undefined).map(option => [option.value, option.name, option.depend])
  })

  /** Use this for hintHelper.ts */
  const hintHelperOptions = computed<OptionHint[]>(() =>
    options.value.filter(e => e.depend !== false).map(option => ({ option: option.exampleValue ? option.name.format(option.exampleValue) : option.name, hint: option.help }))
  )

  /** Display option as status */
  function displayOption(value: string | undefined): StatusObject | undefined {
    const realOption = options.value.find(option => option.value === value)
    if (realOption)
      return {
        status: realOption.name,
        helpTitle: realOption.name,
        help: realOption.help,
        type: realOption.type
      }
    const customOption = options.value.find(option => option.value === undefined) as CustomOption
    if (customOption)
      return {
        status: customOption.name.format(value),
        helpTitle: customOption.name.format(value),
        help: customOption.help,
        type: customOption.type
      }
    return value === undefined ? undefined : { status: value }
  }

  /** Universal function */
  function getOption(value: string) {
    return options.value.find(option => option.value === value) ?? options.value.find(option => option.value === undefined)
  }

  return {
    inputOptions,
    hintHelperOptions,
    displayOption,
    getOption
  }
}

/**
 * Option composible to use options in various ways while declaring them only once
 */
export function useOptions<T = string>(rawOptions: MaybeRef<ValueOption<T>[]>) {
  return _useOptions<ValueOption<T>, T>(rawOptions)
}

export type HintlessValueOption<T = string> = Omit<ValueOption<T>, 'help'>
/**
 * For when you don't want hints
 */
export function useHintlessOptions<T = string>(rawOptions: MaybeRef<HintlessValueOption<T>[]>) {
  return _useOptions<ValueOption<T>, T>(rawOptions as MaybeRef<ValueOption<T>[]>) as Omit<ReturnType<typeof _useOptions>, 'hintHelperOptions'>
}

/** Special case when select has certain custom options. Might not fit universaly. */
export type CustomOption = {
  /** unused var for this value type */
  value?: never
  /**  Pretty key of the value. It must have string formatting symbols so format() incert value.  */
  name: string
  /** Explanation what this option does */
  help: string
  /** This is used to format name when value is uncertain (e.g in field hint as example) */
  exampleValue: string
  /** unused var for this value type */
  depend?: never
  /** How this value should he displayed in status. Most times leave this undefined. */
  type?: StatusObject['type']
}

/**
 * For spacial options that has custom option
 */
export function useCustomOptions<T = string>(rawOptions: MaybeRef<(ValueOption<T> | CustomOption)[]>) {
  return _useOptions<ValueOption<T> | CustomOption, T>(rawOptions)
}
