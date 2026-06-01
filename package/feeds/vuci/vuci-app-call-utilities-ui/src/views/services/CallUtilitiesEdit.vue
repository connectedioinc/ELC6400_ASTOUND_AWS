<template>
  <vuci-form
    v-slot="{ uciData }"
    config="call_utils;user_groups"
    :before-save="() => handleBeforeSave(section)"
    editing
  >
    <utilities-edit-section
      :uci-data="uciData"
      :name="section.id"
      :section="section"
      :title="$utils.getModalTitle($t('Call rule'))"
      :help="$t('This section is used to customize how a \'Call Rule\' will function. Scroll your mouse pointer over field names in order to see helpful hints.')"
      data-key="call_utilities"
      endpoint="call_utilities/rules/config"
    >
      <template #general="{ s }">
        <vuci-form-item-select
          v-bind="pinProps"
          :uci-section="s"
          name="pin"
          :depend="['relay', 'dout'].includes(s.action)"
        />
      </template>
      <template #auth>
        <call-authorization :s="section" />
      </template>
    </utilities-edit-section>
  </vuci-form>
</template>
<script setup lang="ts">
import UtilitiesEditSection from '@/components/shared/MobileUtilities/MobileUtilitiesEditSection.vue'
import CallAuthorization from '@/components/shared/MobileUtilities/MobileUtilitiesAuthorization.vue'
import { useMobileUtilitiesUtils } from '@/composables/useMobileUtilities'
import { useTranslate } from '@ui-core/composables/useI18n'
import { computed } from 'vue'
import type { CallUtilitiesSection } from '@/types/mobileUtilitiesTypes'
import type { Io } from '@/types/ioTypes'

interface CallUtilitiesEditProps {
  section: CallUtilitiesSection
}

const props = defineProps<CallUtilitiesEditProps>()

const $t = useTranslate()

const { gpios, relays, handleBeforeSave } = useMobileUtilitiesUtils()

const pinProps = computed(() => {
  if (props.section.action === 'relay') {
    return {
      label: $t('Relay'),
      help: $t('The relay which will be changed.'),
      options: getMappedIoOptions(relays.value)
    }
  }
  return {
    label: $t('Output'),
    help: $t('The output which will be changed.'),
    options: getMappedIoOptions(gpios.value)
  }
})

function getMappedIoOptions(io: Io[]) {
  return io.map(io => [io.id, io.name_with_pins])
}
</script>
