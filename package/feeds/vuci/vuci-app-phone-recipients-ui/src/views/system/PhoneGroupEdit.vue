<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    editing
    config="user_groups"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$utils.getModalTitle($t('phone group'), section.name)"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'recipients/phone_groups/config' }]"
      data-key="groups"
    >
      <tlt-form-model-item
        :label="$t('Phone number list')"
        :help="
          $t(
            'Upload a file with many unique phone numbers, one phone number per file line (maximum allowed file size is 5 KB). After successful file upload all previously added phone number will be replaced with the ones from the file.'
          )
        "
      >
        <tlt-upload
          name="tel"
          :action="`/api/recipients/phone_groups/config/${section.id}`"
          :max-size="5120"
          instant
          :errors="uploadErrors"
          @uploaded="onUpload"
        />
      </tlt-form-model-item>
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Group name')"
        :hint="$t('Name of grouped phone numbers')"
        placeholder="name"
        name="name"
        required
        maxlength="16"
      />
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('Phone number')"
        :hint="$t('Phone number belonging to a group. Phone number must be in international format.')"
        placeholder="+37000000000"
        :rules="['phonedigit', numberExists]"
        name="tel"
        required
        :maxlines="Infinity"
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
      formData: {},
      uploadErrors: {
        1: this.$t('Error while uploading the file'),
        2: this.$t('File contains duplicate phone numbers'),
        103: this.$t('File contains invalid phone numbers'),
        default: this.$t('Failed to upload phone number list')
      }
    }
  },
  methods: {
    numberExists(val) {
      if (this.section.tel.filter(numberStr => numberStr === val).length > 1) {
        return { isValid: false, message: this.$t("Value '%s' already exists").format(val) }
      }
      return { isValid: true }
    },
    async onUpload({ res }) {
      if (!res.success) return
      this.formData.groups.find(i => i.id === res.data.id).tel = res.data.tel
      return this.$message.success(this.$t('File uploaded successfully'))
    }
  }
}
</script>
