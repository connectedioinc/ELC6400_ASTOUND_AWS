<template>
  <slot
    :state="form.modelValue.value"
    :set-state="form.setModelValue"
    :submit="form.handleSubmit"
    :reset="form.reset"
    :is-submitting="form.isSubmitting.value"
    :changed="form.changed.value"
  />
</template>

<script setup lang="ts">
import { injectFormContext } from './use-form-context'

const form = injectFormContext()
</script>
