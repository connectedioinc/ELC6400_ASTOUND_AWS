<template>
  <slot
    :is-mutating="mutations.isMutating"
    :is-removing="mutations.isRemoving"
    :is-creating="mutations.isCreating"
    :is-updating="mutations.isUpdating"
    :create="mutations.createMutation"
    :remove="mutations.removeMutation"
    :update="mutations.updateMutation"
    :get-current-state="getCurrentState"
    :edit="edit"
  />
</template>

<script lang="ts">
function assertCorrectName(name: unknown): asserts name is number {
  if (!isNumber(name)) throw new Error(`form "name" must be number to be used inside config-mutation, type "${typeof name}" received, value: ${name}`)
}

const noop = () => {}

type MutationContext<T = any> = {
  baseUrl: string
  idKey: keyof T
}

export const [provideMutationContext, injectMutationContext] = createContext<MutationContext>('config-mutation')
</script>

<script setup lang="ts" generic="T extends Record<string, any>, P = {}">
import { provideFormControllerContext, useFormController } from '@components/form'
import { createContext } from '@ui-core/utils/create-context'
import { isNumber } from '@ui-core/utils/inspect'
import { removeMetaFields } from '@ui-core/utils/transforms'
import type { Component, ComponentOptions, DefineComponent } from 'vue'
import { computed, toRef } from 'vue'
import type { ValidSubmitContext, InvalidSubmitContext } from '@components/form/use-form-controller'
import { injectControllerContext } from './ConfigController.vue'
import { injectConfigRootContext } from './ConfigRoot.vue'
import { useConfigMutations, type UseConfigMutationProps } from './use-config-mutations'
import type { ConfigEntry } from './query/collection-cache'
import { resolveUpdater } from '@ui-core/utils/core-utils'

type Props<T extends Record<string, any>, P = {}> = {
  readonly?: boolean
  /**
   * a callback with instructions on how to transform the data before it is sent to the server
   * invoked only before `update` operation.
   */
  transform?: (data: T) => T

  validateSubmit?: (context: ValidSubmitContext<T>[]) => Promise<string | undefined> | string | undefined
  onSubmitInvalid?: (data: InvalidSubmitContext) => Promise<any> | any

  editComponent?: DefineComponent<P> | Component<P> | ComponentOptions<P>
  /**
   * `entry` prop is reserved, because it will be assigned automatically.
   */
  editComponentProps?: Omit<P, 'entry' | 'queryKey' | 'id'> | ((editable: T) => Omit<P, 'entry' | 'queryKey' | 'id'>)
} & UseConfigMutationProps<T>
const props = withDefaults(defineProps<Props<T, P>>(), {
  idKey: 'id' as keyof T,
  transform: undefined,
  editComponent: undefined,
  editComponentProps: undefined,
  onUpdate: noop,
  onUpdateSuccess: noop,
  onUpdateError: noop,
  onUpdateSettled: noop,
  onRemove: noop,
  onRemoveSuccess: noop,
  onRemoveError: noop,
  onRemoveSettled: noop,
  onCreate: noop,
  onCreateError: noop,
  onCreateSuccess: noop,
  onCreateSettled: noop,
  validateSubmit: undefined,
  onSubmitInvalid: undefined
})

const controller = injectControllerContext()
const client = injectConfigRootContext()
const collection = client.client.getCollectionCache().build({
  queryKey: props.queryKey
})

const mutations = useConfigMutations(props, client.client)

const formController = useFormController({
  validateSubmit: props.validateSubmit,
  readonly: toRef(props, 'readonly'),
  async onSubmit(results) {
    // ids should not change during server update, so mapping stable data id to the entry id
    let payload = results.map(d => {
      assertCorrectName(d.name)
      return [d.name, runTransformations(d.data)] as [number, T]
    })
    await mutations.updateMutation(payload)
  },
  onSubmitInvalid: props.onSubmitInvalid
})

provideFormControllerContext(formController)

const getCurrentState = (id: ConfigEntry['id']) => {
  return formController.getFormValue<T>(id)
}

async function save() {
  await formController.handleSubmit(true, true)
  return formController.isSubmitSuccessful.value
}

const transformations = computed(() => {
  return [removeMetaFields, props.transform].filter(d => d) as Array<(data: T) => T>
})

function runTransformations(data: T) {
  let res = data
  for (const transform of transformations.value) {
    res = transform(res)
  }
  return res
}

controller.add({
  isMutating: mutations.isMutating,
  changed: formController.changed,
  save,
  validate: async () => {
    formController.validate()
    return formController.valid.value
  },
  valid: formController.valid,
  softSave: () => {
    formController.forms.value.forEach(form => {
      if (!form.changed.value) return
      const entryId = form.name.value
      assertCorrectName(entryId)
      collection.softUpdate(entryId, form.getFormValue() as T)
    })
    return true
  }
})

const context = injectConfigRootContext()

function edit(state: T, entry: ConfigEntry<T>) {
  if (!props.editComponent) throw new Error('Edit form is missing. please provide it with :edit-component="SomeEditComponent"')

  const idKey = mutations.idKey

  const editComponentProps = {
    ...resolveUpdater(props.editComponentProps, state),
    entry: entry,
    queryKey: props.queryKey,
    id: entry.data[idKey]
  } as unknown as P

  collection.softUpdate(entry.id, state)

  context.openModal({
    entry,
    component: props.editComponent,
    props: editComponentProps,
    name: entry.data[idKey] as string,
    title: 'Edit instance'
  })
}

provideMutationContext({
  baseUrl: mutations.baseUrl!,
  idKey: mutations.idKey!
})
</script>
