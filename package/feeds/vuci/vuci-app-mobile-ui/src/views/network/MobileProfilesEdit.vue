<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="esim"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$utils.getModalTitle($t('profile'), section.name || section.id)"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'esim/config' }]"
      data-key="profile"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="name"
        :label="$t('Name')"
        :help="$t('Name of profile.')"
        :rules="['uciname', validateName]"
        maxlength="64"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {}
    }
  },
  methods: {
    validateName(val) {
      if (this.formData.profile.some(s => s.name === val && s.id !== this.section.id && s.modem === this.section.modem)) {
        return { isValid: false, message: this.$t("Profile with name '%s' already exists").format(val) }
      }
      return { isValid: true }
    }
  }
}
</script>
