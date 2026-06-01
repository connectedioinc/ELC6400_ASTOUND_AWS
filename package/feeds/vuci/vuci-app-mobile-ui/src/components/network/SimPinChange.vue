<template>
  <tlt-modal
    ref="tltModal"
    :open="showModal"
    :title="$t('SIM%s PIN change').format(sim)"
    :help="$t('Enter current and new PIN codes to change SIM card PIN code.')"
    size="medium"
    @close="closeModal"
  >
    <tlt-form
      ref="tltForm"
      class="mb-8"
      :model="form"
      sid="sim_pin_change"
    >
      <ListLayout gap="md">
        <tlt-form-item-input
          v-model="form.pin"
          :label="$t('Current SIM%s PIN').format(sim)"
          prop="pincode"
          :help="$t('Enter current SIM PIN.')"
          :placeholder="currentPin"
          rules="pincode"
          password
          sensitive
          required
        />
        <tlt-form-item-input
          v-model="form.newPin"
          :label="$t('New SIM%s PIN').format(sim)"
          prop="newPincode"
          :help="$t('Enter new SIM PIN.')"
          rules="pincode"
          password
          sensitive
          required
          @change="updateValidations"
        />
        <tlt-form-item-input
          v-model="form.newPin2"
          :label="$t('Confirm new SIM%s PIN').format(sim)"
          prop="newPincode2"
          :help="$t('Confirm new SIM PIN.')"
          :rules="['pincode', isMatchingPins]"
          password
          sensitive
          required
          @change="updateValidations"
        />
      </ListLayout>
    </tlt-form>
    <template #actions>
      <tlt-alert
        id="pin-change-alert"
        type="warning"
        inline
      >
        {{ pinMessage }}
      </tlt-alert>
      <div class="flex justify-between mt-8">
        <tlt-button
          color="secondary"
          button-id="cancel"
          @click="closeModal"
        >
          {{ $t('Cancel') }}
        </tlt-button>
        <tlt-button
          button-id="saveandapply"
          @click="save()"
        >
          {{ $t('Change') }}
        </tlt-button>
      </div>
    </template>
  </tlt-modal>
</template>
<script>
import TltAlert from '@/components/Messenger/TltAlert.vue'

export default {
  components: {
    TltAlert
  },
  props: {
    showModal: {
      type: Boolean,
      required: true
    },
    modem: {
      type: String,
      required: true
    },
    sim: {
      type: Number,
      required: true
    },
    currentPin: {
      type: String,
      default: ''
    }
  },
  emits: ['close'],
  data() {
    return {
      form: {
        pin: '',
        newPin: '',
        newPin2: ''
      },
      pinMessage: this.$t('Recheck whether the entered current PIN is correct because after three incorrect attempts, your SIM card will be blocked')
    }
  },
  methods: {
    save() {
      return this.$refs.tltForm.validate().then(validationResult => {
        if (!validationResult.valid) return this.$message.error(this.$t('Some fields are invalid'))
        this.$spin(true)
        return this.$axios
          .post(`/api/modems/${this.modem}/actions/change_pin`, { data: { pin: this.form.pin, new_pin: this.form.newPin } })
          .then(() => {
            this.$message.success(this.$t('SIM card PIN changed'))
          })
          .catch(err => {
            const error = err?.response?.data?.errors?.[0]
            if (error?.code === 1) this.$message.error(this.$t('Failed to set new PIN, SIM card lock is not enabled.'))
            else if (error?.code === 2) {
              const errorTranslation = {
                'Failed to change SIM PIN code. Current PIN code might be wrong. 3 PIN attempts left.': this.$t(
                  'Failed to change SIM PIN code. Current PIN code might be wrong. %s PIN attempts left.'
                ).format(3),
                'Failed to change SIM PIN code. Current PIN code might be wrong. 2 PIN attempts left.': this.$t(
                  'Failed to change SIM PIN code. Current PIN code might be wrong. %s PIN attempts left.'
                ).format(2),
                'Failed to change SIM PIN code. Current PIN code might be wrong. 1 PIN attempts left.': this.$t(
                  'Failed to change SIM PIN code. Current PIN code might be wrong. %s PIN attempts left.'
                ).format(1)
              }
              this.$message.error(errorTranslation[error.error])
            } else {
              this.$message.error(this.$t('Failed to change SIM card PIN'))
            }
          })
          .finally(() => {
            this.$spin(false)
            this.closeModal()
          })
      })
    },
    closeModal() {
      this.form.pin = ''
      this.form.newPin = ''
      this.form.newPin2 = ''
      this.$emit('close')
    },
    isMatchingPins() {
      return {
        isValid: this.form.newPin === this.form.newPin2,
        message: this.$t('The confirmation PIN must match the new PIN')
      }
    },
    updateValidations() {
      this.$refs.tltForm.validate()
    }
  }
}
</script>
