<template>
  <vuci-form-item-button
    :uci-section="s"
    name="downloadExampleConditionLua"
    :label="$t('Lua condition example script')"
    :text="$t('Download')"
    :depend="isTypeSelected"
    no-write
    @click="downloadLuaExampleFile('conditions')"
  />
  <vuci-form-item-upload
    :uci-section="s"
    name="lua_cond_path"
    :label="$t('File')"
    :help="$t('Upload a Lua script file.')"
    required
    :depend="isTypeSelected"
    :readonly="$session.group !== 'root'"
  >
    <template
      v-if="$session.group !== 'root'"
      #after-content="{ controlRef }"
    >
      <tlt-tooltip
        :target="() => controlRef"
        placement="bottom-start"
        fallback-placements="top-start"
        :content="$t('Current user is unauthorized to edit scripts.')"
      />
    </template>
  </vuci-form-item-upload>
</template>
<script setup lang="ts">
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { useTranslate } from '@ui-core/composables/useI18n'

const props = defineProps(moduleProps)

const $t = useTranslate()

const { isTypeSelected, downloadLuaExampleFile } = useEventsJugglerModuleData(props)
</script>
