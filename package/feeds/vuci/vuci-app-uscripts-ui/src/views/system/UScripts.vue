<template>
  <tlt-card
    :title="$t('Startup script')"
    :help="$t('Put your custom commands here that should be executed after reboot, once the system init finished.')"
  >
    <tlt-text-area
      v-model="areaValue"
      custom-id="area-value"
      :rows="18"
    />
    <div class="ml-auto w-max">
      <tlt-button
        button-id="saveandapply"
        @click="saveScript"
      >
        {{ $t('Save & Apply') }}
      </tlt-button>
    </div>
  </tlt-card>
</template>
<script>
export default {
  data() {
    return {
      areaValue: ''
    }
  },
  created() {
    this.$spin()
    return this.$axios
      .get('/api/uscripts/config')
      .then(response => {
        this.areaValue = response.data.script
      })
      .catch(() => this.$message.error(this.$t('Failed to load custom scripts')))
      .finally(() => this.$spin(false))
  },
  methods: {
    saveScript() {
      return this.$axios
        .post('/api/uscripts/actions/upload', this.createFormData())
        .then(() => this.$message.success(this.$t('Custom scripts have been applied')))
        .catch(() => this.$message.error(this.$t('Failed to apply custom scripts')))
    },
    createFormData() {
      const formData = new FormData()
      const file = new File([this.areaValue], 'rc.local')
      formData.append('file', file)
      return formData
    }
  }
}
</script>
