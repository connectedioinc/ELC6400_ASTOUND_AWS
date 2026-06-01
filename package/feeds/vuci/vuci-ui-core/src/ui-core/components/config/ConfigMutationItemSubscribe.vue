<template>
  <slot v-bind="mutationItemContext" />
</template>

<script setup lang="ts">
import { injectMutationItemContext } from './ConfigMutationItem.vue'
const mutationItemContext = injectMutationItemContext()
</script>
