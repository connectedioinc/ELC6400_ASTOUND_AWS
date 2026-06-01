<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="gps"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'gps/nmea/config' }]"
      data-key="nmeaGeneral"
      name="nmea_forwarding"
      :error-handlers="{ edit: returnErrorMessage }"
    >
      <tlt-card
        :title="$t('NMEA collecting')"
        :help="$t('This section is used to turn NMEA sentence collecting on or off.')"
      >
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enabled')"
          :help="$t('Turns NMEA sentence collecting on or off.')"
          name="collecting_enabled"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('File')"
          :help="$t('Location of the file where collected NMEA sentences will be stored.')"
          name="collecting_location"
          placeholder="/mnt/file"
          :rules="validateLocation"
          maxlength="null"
          :required="s.collecting_enabled === '1'"
        />
      </tlt-card>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { getValidationErrorMessage, validatePosixPath } from '@/plugins/fileValidator'

export default {
  data() {
    return {
      formData: {}
    }
  },
  methods: {
    returnErrorMessage(errors) {
      const errorCode = errors?.data?.errors?.[0]?.code
      if (errorCode === 3) return this.$t('Location must be prefixed with "/mnt/" to avoid wear out of device flash')
      else if (errorCode === 5) return this.$t('Collecting file cannot be the same as NMEA forwarding cache file')
      else return getValidationErrorMessage(errorCode)
    },
    validateLocation(v) {
      if (v === '/mnt/') {
        return { isValid: false, message: this.$t('Specify file name') }
      }
      const { location, collecting_location } = this.formData.nmeaGeneral[0]
      if (location === collecting_location) return { isValid: false, message: this.$t('Cache and collecting file locations must be different') }
      if (!v.startsWith('/mnt/'))
        return {
          isValid: false,
          message: this.$t('Location must be prefixed with "/mnt/" to avoid wear out of device flash')
        }
      const [isValid, errorCode] = validatePosixPath(v, 'file')
      if (!isValid) return { isValid: false, message: getValidationErrorMessage(errorCode) }

      return { isValid: true }
    }
  }
}
</script>
