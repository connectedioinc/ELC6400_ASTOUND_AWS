<template>
  <rms
    :after-save="afterSaveRedirect"
    :load-extra="loadModemsInfo"
    wizard
    :save-button-text="$t('Finish')"
  >
    <template #footerButtons>
      <setup-wizard-steps
        ref="steps"
        :next="false"
        :back="{ reverse: true }"
        :show-next="false"
      />
    </template>
  </rms>
</template>
<script>
import Rms from '@/components/services/RMS.vue'
import { changeLANIP } from '@/router'
import SetupWizardSteps from '@/components/system/SetupWizardSteps.vue'

export default {
  components: { Rms, SetupWizardSteps },
  data() {
    return {
      modem: true
    }
  },
  methods: {
    async afterSaveRedirect() {
      if (this.$store.lanIP) return changeLANIP()
      this.$refs.steps.onNextClick()
    },
    loadModemsInfo() {
      return this.$axios
        .get('/api/modems/status', { condition: 'mobifd.control' })
        .then(({ data }) => {
          this.modem = data.some(m => m.builtin)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load modem status'))
        })
    }
  }
}
</script>
