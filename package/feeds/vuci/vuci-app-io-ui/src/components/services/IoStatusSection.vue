<template>
  <io-status-table
    :title="title"
    :io-data="ioData"
  />
  <io-pinout :pinout-data="pinoutBlock" />
</template>

<script setup lang="ts">
import IoPinout from '@/components/services/io/IoPinout.vue'
import IoStatusTable from './IoStatusTable.vue'
import { type IoPinoutBlock } from '@/components/services/io/useIoPinoutBlocks'
import type { Io } from '@/types/ioTypes'

interface IoStatusSectionProps {
  title: string
  ioData: Io[]
  pinoutBlock: IoPinoutBlock | undefined
}

defineProps<IoStatusSectionProps>()
</script>
