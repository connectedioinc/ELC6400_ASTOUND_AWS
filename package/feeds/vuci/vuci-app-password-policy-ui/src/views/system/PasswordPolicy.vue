<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="rpcd"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'password_policy/config' }]"
      data-key="password_policy"
      :title="$t('Password policy')"
      :after-save="afterSave"
      :help="$t('This section is used to configure password policy and password expiration settings.')"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="password_length"
        :label="$t('Minimum password length')"
        :help="$t('Minimum password length is from 8 to 64 characters.')"
        rules="irange(8,64)"
        required
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Digits')"
        :help="$t('Password must contain at least one digit (0-9).')"
        name="require_digits"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Upper / lower case characters')"
        :help="$t('Password must contain at least one upper and lower case letter (A-Z, a-z).')"
        name="require_lower_upper"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Special characters')"
        :help="$t('Password must contain at least one special character %s.').format(specialChars)"
        name="require_special"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Password expiration')"
        :help="$t('A new password will need to be created once the current one reaches its expiration date. The password expiration period can be set from 1 to 365 days.')"
        name="password_expiration"
        :initial="s.password_lifetime && s.password_lifetime !== '0' ? '1' : '0'"
        no-write
        @change="self => updatePasswordLifetime(self, s)"
      />
      <vuci-form-item-input
        v-show="s.password_expiration === '1'"
        :uci-section="s"
        name="password_lifetime"
        :label="$t('Expires in')"
        :rules="`irange(${daysLeft},365)`"
        placeholder="1-365"
        required
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      formData: {},
      specialChars: '(~`! @#$%^&*()-_+={}[]|\\;:"<>,./?)'
    }
  },
  computed: {
    daysLeft() {
      if (this.formData.password_policy[0].password_expiration === '0') return '0'
      const { current_days_left, password_lifetime } = this.$store.passwordPolicy
      return Number(password_lifetime - Number(current_days_left || 0) + 1)
    }
  },
  methods: {
    updatePasswordLifetime(self, s) {
      this.formData.password_policy[0].password_lifetime = s.password_expiration === '1' && s.password_lifetime === '0' ? '' : '0'
    },
    afterSave(_, res) {
      this.$store.passwordPolicy = { ...res.data }
    }
  }
}
</script>
