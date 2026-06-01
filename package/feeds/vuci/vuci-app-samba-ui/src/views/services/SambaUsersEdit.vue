<template>
  <vuci-form
    v-slot="{ uciData }"
    config="samba"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('Change password')"
      :name="section.id"
      :endpoints="[{ endpoint: 'samba/users/config' }]"
      data-key="users"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="password"
        required
        :label="$t('New password')"
        :help="
          $t(
            'Password requirements: 8-32 characters, at least one uppercase letter, \
                                  one lowercase letter and one number'
          )
        "
        password
        can-randomize
        maxlength="32"
        minlength="8"
        rules="root_password"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="passwordConfirm"
        required
        password
        no-write
        minlength="8"
        maxlength="32"
        :label="$t('Confirm new password')"
        :help="
          $t(
            'Password requirements: 8-32 characters, at least one uppercase letter, \
                                  one lowercase letter and one number'
          )
        "
        :rules="['root_password', isPasswordConfirmationCorrect]"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  name: 'SambaUserEdit',
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  methods: {
    isPasswordConfirmationCorrect() {
      if (this.section.password !== this.section.passwordConfirm) return { isValid: false, message: this.$t('Given password confirmation did not match') }
      else return { isValid: true }
    }
  }
}
</script>
