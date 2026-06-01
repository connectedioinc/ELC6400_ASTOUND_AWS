<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="operctl"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'operator_lists/config' }]"
      data-key="operators"
    >
      <tlt-card :title="$utils.getModalTitle($t('operator list'), section.name)">
        <vuci-form-item-input
          :uci-section="s"
          name="name"
          :label="$t('Name')"
          :help="$t('Name of the list, used for easier management.')"
          :rules="[validateName, 'uciname']"
          maxlength="16"
          required
        />
      </tlt-card>
    </vuci-named-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { OperatorListConfig } from '@/types/mobileTypes'
import { useTranslate } from '@ui-core/composables/useI18n'

const $t = useTranslate()

interface Props {
  section: OperatorListConfig
}
const props = defineProps<Props>()

interface FormData {
  operators: OperatorListConfig[]
}

const formData = ref<FormData>({ operators: [] })

function validateName(val: string) {
  if (formData.value.operators.some(s => s.name === val && s.id !== props.section.id)) {
    return { isValid: false, message: $t("Operator's list '%s' already exists").format(val) }
  }
  return { isValid: true }
}
</script>
