<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="loadInitial"
    config="landingpage"
    editing
  >
    <vuci-named-section
      :uci-data="uciData"
      section-id="name"
      :title="title"
      :endpoints="[{ endpoint: `hotspot/themes/${theme}/config`, sectionFilter: section => section[0] }]"
      :data-key="section.file !== 'landing_page.css' ? `${theme}-${section.file.slice(0, -4)}` : `${theme}-css`"
      :after-save="afterSave"
    >
      <template #default="{ s }">
        <vuci-form-item-text-area
          :uci-section="s"
          name="file"
          rows="30"
          full-width
        />
      </template>
      <template
        v-if="resettable"
        #buttons
      >
        <tlt-button
          button-id="reset"
          @click="resetText"
        >
          {{ $t('Reset') }}
        </tlt-button>
      </template>
    </vuci-named-section>
  </vuci-form>
</template>
<script>
export default {
  props: {
    theme: {
      type: String,
      required: true
    },
    section: {
      type: Object,
      required: true
    },
    resettable: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      title: `${this.section.file} ${this.$t('file')}`
    }
  },
  methods: {
    resetText() {
      return this.$prompt.show({
        title: this.$t('Reset template?'),
        content: this.$t('Are you sure you want to reset template?'),
        okText: this.$t('Reset'),
        cancelText: this.$t('Cancel'),
        onOk: () => this.onOk()
      })
    },
    onOk() {
      this.$spin()
      const file = {
        data: {
          file: this.section.file !== 'landing_page.css' ? this.section.file : 'css.htm'
        }
      }
      return this.$axios
        .post(`/api/hotspot/themes/${this.theme}/actions/reset`, file)
        .then(({ data }) => {
          const formDataFile = this.formData[`${this.theme}-${this.section.file.slice(0, -4)}`]
          this.section.file !== 'landing_page.css' ? (formDataFile[0].file = data.file) : (this.formData[`${this.theme}-css`][0].file = data.file)
          this.$message.success(this.$t('Template has been reset'))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to reset template'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    loadInitial() {
      const fileName = this.section.file !== 'landing_page.css' ? this.section.file.slice(0, -4) : 'css'
      return this.$axios
        .get(`/api/hotspot/themes/${this.theme}/config/${fileName}`)
        .then(data => {
          this.section.file !== 'landing_page.css'
            ? (this.formData[`${this.theme}-${this.section.file.slice(0, -4)}`][0].file = data.data.file)
            : (this.formData[`${this.theme}-css`][0].file = data.data.file)
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    afterSave(_, res) {
      res.data.name = this.section.file.slice(0, -4)
    }
  }
}
</script>
