<template>
  <Primitive
    :as-child="props.asChild"
    :as="props.as"
    @submit.prevent.stop="onSubmit"
    @reset="form.reset"
  >
    <slot
      :state="form.modelValue.value as T"
      :set-state="form.setModelValue"
      :submit="form.handleSubmit"
      :reset="form.reset"
      :is-submitting="form.isSubmitting.value"
      :changed="form.changed.value"
    />
  </Primitive>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
import Primitive, { type PrimitiveProps } from '../primitive/Primitive.vue'
import { useForm, type FormProps } from './use-form'
import { injectFormControllerContext } from './use-form-controller-context'
import { provideFormContext } from './use-form-context'
import { computed, onBeforeUnmount, toRef } from 'vue'

type Props = FormProps<T> &
  PrimitiveProps & {
    /**
     * whether this form should skip registering to the global form collection
     * @default false
     */
    standalone?: boolean
  }

const props = withDefaults(defineProps<Props>(), {
  onSubmit: () => {},
  onSubmitInvalid: () => {},
  asChild: false,
  as: 'form',
  standalone: false,
  name: ''
})
const formController = props.standalone ? undefined : injectFormControllerContext()

const isReadonly = computed(() => formController?.readonly.value || props.readonly)

const form = useForm<T>({
  name: toRef(props, 'name'),
  defaultValues: toRef(props, 'defaultValues') as T,
  readonly: isReadonly,
  onSubmit: props.onSubmit,
  onSubmitInvalid: props.onSubmitInvalid,
  validateSubmit: props.validateSubmit
})

provideFormContext(form)

if (!props.standalone && formController) {
  const remove = formController.add(form)
  onBeforeUnmount(() => {
    remove()
  })
}

function onSubmit() {
  if (formController) return formController.handleSubmit()
  form.handleSubmit()
}
defineExpose(form)
</script>
