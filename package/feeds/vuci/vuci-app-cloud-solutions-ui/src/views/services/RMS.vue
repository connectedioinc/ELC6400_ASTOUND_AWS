<template>
  <rms :save-button-text="$t('Save & Apply')" />
</template>
<script>
import Rms from '@/components/services/RMS.vue'
export default {
  components: { Rms }
}
</script>
