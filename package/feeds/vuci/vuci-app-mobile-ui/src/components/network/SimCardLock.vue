<template>
  <tlt-modal
    :open="showModal"
    size="medium"
    :title="modal.title"
    :help="$t('Enable/Disable SIM card lock.')"
    @close="closeModal"
  >
    <ListLayout
      gap="md"
      class="mb-8"
    >
      <tlt-form
        ref="lockForm"
        :model="modal"
        sid="pin_lock"
      >
        <tlt-form-item-input
          v-model="pin"
          :help="$t('Enter SIM PIN code that is between 4 and 8 digits.')"
          :label="modal.fieldText"
          prop="pin"
          rules="pincode"
          password
          sensitive
          required
        />
      </tlt-form>
    </ListLayout>
    <template #actions>
      <tlt-alert
        id="sim-lock-alert"
        type="warning"
        inline
      >
        {{ modal.content }}
      </tlt-alert>
      <div class="flex justify-between mt-8">
        <tlt-button
          button-id="cancel"
          color="secondary"
          @click="closeModal"
        >
          {{ $t('Cancel') }}
        </tlt-button>
        <tlt-button
          button-id="ok"
          @click="save"
        >
          {{ modal.okText }}
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
    modal: {
      type: Object,
      required: true
    },
    modem: {
      type: String,
      required: true
    },
    pinLock: {
      type: Boolean,
      required: true
    }
  },
  emits: ['close', 'success'],
  data() {
    return {
      pin: ''
    }
  },
  methods: {
    save() {
      return this.$refs.lockForm.validate().then(validationResult => {
        if (!validationResult.valid) return this.$message.error(this.$t('Some fields are invalid'))
        const enabled = this.pinLock ? '0' : '1'
        return this.$axios
          .post(`/api/modems/${this.modem}/actions/pin_lock`, {
            data: {
              enabled,
              pin: this.pin
            }
          })
          .then(() => {
            this.$message.success(enabled === '0' ? this.$t('SIM card lock disabled') : this.$t('SIM card lock enabled'))
            this.$emit('success', enabled)
          })
          .catch(err => {
            const error = err?.response?.data?.errors?.[0]
            const errorTranslation = {
              'Failed to set PIN lock. PIN code might be wrong. 3 PIN attempts left.': this.$t('Failed to set SIM card lock. PIN code might be wrong. %s PIN attempts left.').format(3),
              'Failed to set PIN lock. PIN code might be wrong. 2 PIN attempts left.': this.$t('Failed to set SIM card lock. PIN code might be wrong. %s PIN attempts left.').format(2),
              'Failed to set PIN lock. PIN code might be wrong. 1 PIN attempts left.': this.$t('Failed to set SIM card lock. PIN code might be wrong. %s PIN attempts left.').format(1),
              'Failed to set PIN lock. PIN code might be wrong. 0 PIN attempts left.': this.$t('Failed to set SIM card lock. PIN code might be wrong. %s PIN attempts left.').format(0)
            }
            this.$message.error(error?.code === 2 ? errorTranslation[error.error] : this.$t('Failed to set SIM card lock'))
          })
          .finally(() => {
            this.closeModal()
          })
      })
    },
    closeModal() {
      this.pin = ''
      this.$emit('close')
    }
  }
}
</script>
