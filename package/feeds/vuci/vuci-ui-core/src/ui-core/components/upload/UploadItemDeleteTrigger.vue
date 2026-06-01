<template>
  <button
    type="button"
    @click="itemContext.remove"
  >
    <slot>
      <TltIcon
        icon="x"
        class="size-4"
      />
    </slot>
  </button>
</template>

<script setup lang="ts">
import TltIcon from '@ui-core/tlt-design/icons/TltIcon.vue'
import { injectUploadItemContext } from './UploadItem.vue'

const itemContext = injectUploadItemContext()
</script>
