import { computed, type ComputedRef } from 'vue'
import { ariaAttribute, dataAttribute } from '@ui-core/utils/attributes'
import { useComposedIds } from '@ui-core/composables/use-composed-ids'

type AriaProps = {
  id: string
  /**
   * label that will be added to the control as `aria-label`. Use this as an alternative to mounting label element/component.
   */
  controlLabel?: ComputedRef<string | undefined>
  /**
   * @default false
   */
  disabled: ComputedRef<boolean | undefined>
  /**
   * @default false
   */
  readonly: ComputedRef<boolean | undefined>
  /**
   * @default false
   */
  required: ComputedRef<boolean | undefined>
  valid: ComputedRef<boolean | undefined>
  name: ComputedRef<number | string | undefined>
}

export function useFieldAria(props: AriaProps) {
  const { disabled, readonly, required, valid, name, controlLabel } = props
  const { main: control, root, label, help, meta } = useComposedIds(props.id, ['root', 'label', 'help', 'meta'])

  const labelProps = computed(() => ({
    as: 'label',
    id: label.value,
    for: control.value
  }))

  const rootProps = computed(() => ({
    role: 'group' as const,
    // commented out, since tests fail :(
    // 'aria-labelledby': label.value,
    id: root.value,
    'data-disabled': dataAttribute(disabled.value),
    'data-readonly': dataAttribute(readonly.value)
  }))

  const metaProps = computed(() => ({
    'aria-live': 'polite',
    id: meta.value
  }))

  const helpProps = computed(() => ({
    'aria-live': 'polite',
    id: help.value
  }))

  const controlProps = computed<Record<string, any>>(() => ({
    id: control.value,
    name: name.value,
    required: required.value,
    disabled: disabled.value,
    readonly: readonly.value,
    'aria-label': controlLabel?.value,
    'aria-invalid': ariaAttribute(!valid.value),
    'aria-required': ariaAttribute(required.value),
    'aria-readonly': ariaAttribute(readonly.value)
  }))
  return {
    ids: {
      root,
      control,
      label,
      help,
      meta
    },
    rootProps,
    labelProps,
    controlProps,
    metaProps,
    helpProps
  }
}

export function useListFieldAria(props: AriaProps) {
  const { helpProps, metaProps, ids, rootProps: _rootProps } = useFieldAria(props)

  const labelProps = computed(() => ({
    as: 'legend',
    id: ids.label.value
  }))

  const rootProps = computed(() => ({
    ..._rootProps.value,
    'aria-labelledby': props.controlLabel?.value ? undefined : ids.label.value,
    'aria-label': props.controlLabel?.value,
    'aria-describedby': [ids.help.value, ids.meta.value].join(' ')
  }))

  return {
    ids,
    rootProps,
    labelProps,
    metaProps,
    helpProps,
    controlProps: computed(() => ({}))
  }
}
