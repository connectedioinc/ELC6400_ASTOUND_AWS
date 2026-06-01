<template>
  <tlt-form
    sid="firewall_custom_rules"
    :title="$t('Firewall - custom rules')"
    :help="
      $t(
        'Custom rules allow you to execute arbitrary iptables commands \
        which are not otherwise covered by the firewall framework. \
        The commands are executed after each firewall restart, right after \
        the default ruleset has been loaded.'
      )
    "
  >
    <tlt-text-area
      v-model="areaValue"
      custom-id="area-value"
      :rows="20"
    />
    <div class="flex justify-between">
      <tlt-button
        button-id="reset"
        color="secondary"
        @click="reset()"
      >
        {{ $t('Reset') }}
      </tlt-button>
      <tlt-button
        button-id="saveandapply"
        @click="modifyCustomRules()"
      >
        {{ $t('Save') }}
      </tlt-button>
    </div>
  </tlt-form>
</template>

<script lang="ts" setup>
import { useMainStore } from '@/stores/main'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { onMounted, ref } from 'vue'

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()

const areaValue = ref<string>('')

onMounted(getCustomRules)

function getCustomRules() {
  store.spin()
  return axios
    .get('/api/firewall/custom_rules/config/general')
    .then(({ data }) => {
      areaValue.value = data.custom_rules
    })
    .catch(e => {
      console.error(e)
      message.error($t('Failed to get custom rules data'))
    })
    .finally(() => store.spin(false))
}
function reset() {
  store.spin()
  return axios
    .post('/api/firewall/custom_rules/actions/reset')
    .then(({ data }) => {
      areaValue.value = data.custom_rules
      message.success($t('Custom rules were reset'))
    })
    .catch(e => {
      console.error(e)
      message.error($t('Failed to reset custom rules'))
    })
    .finally(() => store.spin(false))
}
function modifyCustomRules() {
  store.spin()
  return axios
    .put('/api/firewall/custom_rules/config/general', {
      data: {
        custom_rules: areaValue.value
      }
    })
    .then(() => {
      message.success($t('Configuration has been applied'))
    })
    .catch(e => {
      console.error(e)
      message.error($t('Failed to save custom rules'))
    })
    .finally(() => store.spin(false))
}
</script>
