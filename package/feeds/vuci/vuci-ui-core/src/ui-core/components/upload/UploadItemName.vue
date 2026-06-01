<template>
  <Primitive v-bind="props">
    <slot :file-name="name"> {{ name }} </slot>
  </Primitive>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import Primitive, { type PrimitiveProps } from '../primitive/Primitive.vue'
import { injectUploadItemContext } from './UploadItem.vue'

type Props = PrimitiveProps
const props = defineProps<Props>()

const { file } = injectUploadItemContext()

const name = toRef(() => file.value.name)
</script>
