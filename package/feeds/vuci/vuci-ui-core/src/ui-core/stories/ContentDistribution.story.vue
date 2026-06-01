<template>
  <div>
    <tlt-content-distributor
      index="b"
      :values="values"
    ></tlt-content-distributor>
  </div>
</template>

<script setup lang="ts">
import TltContentDistributor from '@ui-core/tlt-design/layout/TltContentDistributor.vue'
import { reactive } from 'vue'

const values = reactive({
  all: { b: { c: 15, d: 14, f: 5 }, a: { c: 145, d: 15 } },
  shown: { b: { c: 15, d: 14, f: 4 }, a: { c: 156, d: 1 } }
})
</script>
