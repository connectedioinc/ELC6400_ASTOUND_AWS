<template>
  <slot
    :submit="collection.handleSubmit"
    :validate="collection.validate"
    :changed="collection.changed"
  />
</template>

<script setup lang="ts">
import { useFormController, type FormControllerProps } from './use-form-controller'
import { provideFormControllerContext } from './use-form-controller-context'

export type Props = FormControllerProps

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  onSubmitInvalid: () => void 0,
  onSubmit: () => void 0
})

const collection = useFormController(props)

defineExpose(collection)

provideFormControllerContext(collection)
</script>

<style lang="" scoped></style>
