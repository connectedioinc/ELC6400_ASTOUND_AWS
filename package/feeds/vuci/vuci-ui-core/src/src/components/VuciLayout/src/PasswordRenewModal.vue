<template>
  <tlt-modal
    :open="open"
    size="small"
    class="backdrop-blur-xs"
    hide-navigation
    :closeable="false"
  >
    <div class="flex flex-col items-center">
      <h4 class="text-salmon font-semibold text-center mb-4">{{ firstLogin ? $t('Set new password') : $t('Your password has expired') }}</h4>
      <p class="text-sm text-center mb-6">
        {{
          firstLogin
            ? $t("You haven't changed the default password for this device.")
            : $t('Your password has reached its expiry date. Due to the security policy of this device, you are required to renew your password.')
        }}
      </p>
      <div class="w-full">
        <tlt-form
          ref="passwordForm"
          class="flex flex-col items-center"
          :toggleable="false"
          :model="passwordForm"
          sid="system_changePassword_toggle"
        >
          <ListLayout gap="md">
            <tlt-form-item-password
              v-model="passwordForm.password"
              :readonly="false"
              :label="$t('New password')"
              prop="password"
              maxlength="256"
              :minlength="$store.passwordPolicy.password_length"
              :rules="v => [v.renew_password.bind(v, $store.passwordPolicy)]"
              use-autocomplete
              required
              can-randomize
              @keyup.enter="setPassword"
            />
            <tlt-form-item-password
              v-model="passwordForm.password_confirm"
              :readonly="false"
              prop="password_confirm"
              :label="$t('Confirm new password')"
              :minlength="$store.passwordPolicy.password_length"
              maxlength="256"
              :rules="v => [v.renew_password.bind(v, $store.passwordPolicy)]"
              use-autocomplete
              required
              @keyup.enter="setPassword"
            />
          </ListLayout>
          <hr class="w-full pb-0!" />
          <template #applyButton>
            <tlt-button
              :disabled="false"
              button-id="submit"
              class="m-auto"
              @click="setPassword"
            >
              {{ $t('Save new password') }}
            </tlt-button>
          </template>
        </tlt-form>
      </div>
    </div>
  </tlt-modal>
</template>
<script>
export default {
  props: {
    open: {
      type: Boolean,
      required: true
    },
    // true - firstLogin, false - renewPassword
    firstLogin: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      passwordForm: {
        password: '',
        password_confirm: '',
        readonlyState: false
      },
      errorMessages: {
        1: this.$t('Password is the same. Use a different new password.'),
        default: this.$t('An unexpected error occurred')
      }
    }
  },
  methods: {
    async setPassword() {
      const validForm = await this.$refs.passwordForm.validate()
      if (!validForm.valid) {
        return this.$message.error({ text: this.$t('Some fields are invalid'), forceShow: true })
      }
      if (this.passwordForm.password !== this.passwordForm.password_confirm) {
        return this.$message.error({ text: this.$t('Given password confirmation did not match, password not changed'), forceShow: true })
      }
      this.$spin()
      try {
        await this.$axios.post(
          '/api/system/actions/change_password_firstlogin',
          {
            data: {
              password: this.passwordForm.password,
              password_confirm: this.passwordForm.password_confirm
            }
          },
          { preventCancel: true }
        )
        this.$message.success(this.$t('Password changed successfully'))
        if (this.firstLogin) {
          this.$store.firstLogin = false
          this.$store.readOnlyPage = this.readonlyState
        } else await this.$axios.get('/api/password_policy/config').then(res => (this.$store.passwordPolicy = { ...res.data[0] }))
        await this.$store.loadMainData()
        this.$store.rerender()
      } catch (error) {
        const message = { forceShow: true, text: this.errorMessages[error?.response?.data?.errors?.[0]?.code] || this.errorMessages.default }
        this.$message.error(message)
      }
      this.$spin(false)
    }
  }
}
</script>
