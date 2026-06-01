<template>
  <tlt-modal
    :open="!!currentChain"
    :nav-bar="displayedBreadcrums"
    @close="closeModal"
  >
    <template
      v-if="breadcrums.length > 1"
      #actions
    >
      <tlt-button
        button-id="cancel"
        color="secondary"
        :disabled="false"
        @click="closeModal"
      >
        {{ $t('Back') }}
      </tlt-button>
    </template>
    <tlt-table
      :id="`chain-${currentChain.chain}`"
      :data-source="currentChain.rules"
      :columns="chainTableColumns()"
      :title="$t(`&quot;%s&quot; chain`).format(currentChain.chain)"
      :no-value-text="$t('This chain contains no rules')"
      :table-actions="['column-list', 'search']"
      :selected-row="currentChain.rules.find(rule => JSON.stringify({ ...rule, pkts: undefined, bytes: undefined }) === JSON.stringify({ ...highlightedRule, pkts: undefined, bytes: undefined }))"
    >
      <template #target="{ record }">
        <tlt-button
          v-if="getChainByName(record.target)"
          button-id="target"
          :disabled="false"
          type="text"
          size="md"
          @click="openModal(getChainByName(record.target)!)"
        >
          {{ record.target }}
        </tlt-button>
        <template v-else>
          {{ record.target }}
        </template>
      </template>
      <template #pkts="{ record }">
        <template v-if="record.pkts">
          {{ $utils.removeOverPrecision('%m'.format(parseInt(record.pkts))) }}
        </template>
        <template v-else>-</template>
      </template>
      <template #bytes="{ record }">
        <template v-if="record.pkts">
          {{ $utils.removeOverPrecision('%mB'.format(parseInt(record.bytes))) }}
        </template>
        <template v-else>-</template>
      </template>
      <template #comment="{ record }">
        <string-with-links :text="record.linkToConfig" />
      </template>
    </tlt-table>
    <tlt-table
      :id="`references-${currentChain.chain}`"
      :data-source="currentReference"
      :columns="tableTableColumns()"
      :title="$t(`&quot;%s&quot; references`).format(currentChain.chain)"
      :no-value-text="$t('This chain is not referenced by other chains')"
      :table-actions="['column-list', 'search']"
      :row-actions="[
        {
          id: 'edit',
          label: $t('View'),
          buttonProps: { iconLeft: 'password', disabled: false },
          callback: record =>
            openModal(
              record.rules.find(rule => rule.target === breadcrums.at(-1)),
              true
            )
        }
      ]"
    >
      <template #chain="{ record }">
        {{ record.chain }}
        <template v-if="getReferenceInfo(record).count > 1"> (x{{ getReferenceInfo(record).count }}) </template>
      </template>
    </tlt-table>
  </tlt-modal>
</template>

<script lang="ts" setup>
import { computed, inject, ref, watchEffect, type ComputedRef } from 'vue'
import { chainTableColumns, FormOptionKey, tableTableColumns, type FormOptions, type ParsedIptablesChain, type ParsedIptablesRule } from './IptablesCommon'
import { useTranslate } from '@ui-core/composables/useI18n'
import { capitalize } from '@ui-core/plugins/helper'
import StringWithLinks from '@/components/shared/StringWithLinks.vue'

const $t = useTranslate()

const { firewallStatus } = inject(FormOptionKey) as FormOptions

const currentTableName = ref('')
const highlightedRule = ref<ParsedIptablesRule | null>(null)
const breadcrums = ref<string[]>([])
const displayedBreadcrums = computed(() => {
  return [capitalize(currentTableName.value), ...breadcrums.value].map((crum, index) => (index === 0 ? $t('"%s" table') : $t('"%s" chain')).format(crum))
})
function closeModal() {
  breadcrums.value.pop()
}
watchEffect(() => {
  if (breadcrums.value.length === 0) highlightedRule.value = null
})
function openModal(target: ParsedIptablesChain | ParsedIptablesRule, highlightRule = true) {
  if (target.table) currentTableName.value = target.table
  if (target.chain) breadcrums.value.push(target.chain)
  if (target.target) {
    // highlights rule where it is used
    if (highlightRule) highlightedRule.value = target
    // Opens targeted chain's table
    else breadcrums.value.push(target.target)
  }

  pruneBreadrums()
}
function pruneBreadrums() {
  const duplicateIndex = breadcrums.value.findIndex((crum, index) => breadcrums.value.lastIndexOf(crum) !== index)
  if (duplicateIndex === -1) return
  breadcrums.value.splice(duplicateIndex + 1)
}

// as ComputedRef is needed because nothing is executed if it is null
const currentChain = computed(() => {
  if (breadcrums.value.length === 0) return null
  else {
    const chainName = breadcrums.value[breadcrums.value.length - 1]
    return getChainByName(chainName)
  }
}) as ComputedRef<ParsedIptablesChain>

const currentTable = computed(() => {
  return firewallStatus.value.find(table => table.table === currentTableName.value)!
})
const currentReference = computed(() => {
  return currentTable.value.chains.filter(getReferenceInfo)!
})

function getReferenceInfo(chain: ParsedIptablesChain) {
  return currentChain.value.references.find(reference => reference.chain === chain.chain)!
}
function getChainByName(chainName: string) {
  return currentTable.value.chains.find(e => e.chain === chainName)
}

defineExpose({
  openModal
})
</script>
