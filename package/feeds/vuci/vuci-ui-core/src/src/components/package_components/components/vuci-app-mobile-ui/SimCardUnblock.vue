<template>
  <tlt-modal
    ref="tltModal"
    :open="open"
    size="medium"
    :title="title"
    :help="type === 2 ? $t('Enter PIN and PUK code to unblock SIM card.') : $t('Enter PIN code to unlock SIM card.')"
    @close="closeModal"
  >
    <ListLayout gap="md">
      <tlt-form
        ref="tltForm"
        class="mb-8"
        :model="form"
        :toggleable="false"
        sid="sim_card_unblock"
        no-apply
      >
        <ListLayout gap="md">
          <tlt-form-item-input
            v-model="form.pincode"
            label="PIN"
            prop="pincode"
            :help="type === 2 ? $t('Enter new or current SIM PIN code that is between 4 and 8 digits.') : $t('Enter SIM PIN code that is between 4 and 8 digits.')"
            rules="pincode"
            password
            sensitive
            required
          />
          <tlt-form-item-input
            v-model="form.pukcode"
            prop="pukcode"
            label="PUK"
            :help="$t('Enter current SIM PUK code consisting of 8 digits.')"
            rules="pukcode"
            :depend="type === 2"
            password
            sensitive
            required
          />
        </ListLayout>
      </tlt-form>
    </ListLayout>
    <template #actions>
      <tlt-alert
        id="sim-unblock-alert"
        type="warning"
        inline
      >
        {{ message }}
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
          button-id="saveandapply"
          @click="save"
        >
          {{ okText }}
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
    open: {
      type: Boolean,
      required: true
    },
    id: {
      type: String,
      required: true
    },
    type: {
      type: Number,
      required: true
    }
  },
  emits: ['close'],
  data() {
    return {
      form: {
        pincode: '',
        pukcode: ''
      },
      errors: {
        1: this.$t('Failed to set new PIN, PUK is not required in this SIM state'),
        2: this.$t('Failed to set new PIN with provided PUK. PUK code might be wrong'),
        3: this.$t('Failed to set new PIN. PUK can only be entered if there are more than 5 attempts left.'),
        default: this.$t('An unexpected error occurred')
      },
      pinErrors: {
        1: this.$t('Failed to set PIN, PIN is not required at this time.'),
        2: this.$t('Failed to set PIN code. PIN code might be wrong.'),
        3: this.$t('Failed to set PIN code. PIN code might be wrong.'),
        default: this.$t('An unexpected error occurred')
      },
      readonly: this.$store.readOnlyPage
    }
  },
  computed: {
    message() {
      return this.type === 2
        ? this.$t('Recheck whether the entered PUK is correct because after 10 incorrect attempts, your SIM card will be permanently blocked.')
        : this.$t('Recheck whether the entered PIN is correct because after 3 incorrect attempts, your SIM card will be blocked.')
    },
    okText() {
      return this.type === 2 ? this.$t('Unblock') : this.$t('Unlock')
    },
    title() {
      return this.type === 2 ? this.$t('SIM card unblock') : this.$t('SIM card unlock')
    }
  },
  watch: {
    open(value) {
      if (value) this.$store.readOnlyPage = false
      else this.$store.readOnlyPage = this.readonly
    }
  },
  methods: {
    save() {
      return this.$refs.tltForm.validate().then(validationResult => {
        if (!validationResult.valid) return this.$message.error(this.$t('Some fields are invalid'))
        return this.$prompt.show({
          title: this.title,
          content: this.message,
          okText: this.okText,
          cancelText: this.$t('Cancel'),
          onOk: () => {
            let url = `/api/modems/${this.id}/actions/sim_unlock`
            const data = { data: { pin: this.form.pincode } }
            if (this.type === 2) {
              url = `/api/modems/${this.id}/actions/sim_unblock`
              data.data.puk = this.form.pukcode
            }
            this.$spin(true)
            return this.$axios
              .post(url, data)
              .then(() => {
                this.$message.success(this.type === 2 ? this.$t('SIM card unblocked') : this.$t('SIM card unlocked'))
                this.$notification.remove({ id: 'simcard_%s'.format(this.id) })
                this.$alert.remove({ id: 'simcard_%s'.format(this.id) })
                this.$bus.emit('update-pincode', this.form.pincode, this.id)
              })
              .catch(e => {
                if (this.type === 2) this.$message.error(this.errors[e?.response?.data?.errors?.[0].code] || this.errors.default)
                else this.$message.error(this.pinErrors[e?.response?.data?.errors?.[0].code] || this.pinErrors.default)
                if (e?.response?.data?.errors?.[0].code === 1) {
                  this.$notification.remove({ id: 'simcard_%s'.format(this.id) })
                  this.$alert.remove({ id: 'simcard_%s'.format(this.id) })
                }
              })
              .finally(() => {
                this.$spin(false)
                this.closeModal()
              })
          }
        })
      })
    },
    closeModal() {
      this.form.pincode = ''
      this.form.pukcode = ''
      this.$emit('close')
    }
  }
}
</script>
