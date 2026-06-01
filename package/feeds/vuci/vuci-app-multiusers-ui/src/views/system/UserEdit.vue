<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formModel"
    :editing="isUserEdit"
    config="rpcd"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'users/config' }]"
      :name="currentSection.id"
      data-key="users"
      :title="$utils.getModalTitle($t('user'), currentUsername)"
      :error-handlers="handleError()"
      :after-save="afterSave"
    >
      <vuci-form-item-dummy
        :uci-section="s"
        :label="$t('Username')"
        name="username"
        no-write
      />
      <vuci-form-item-input
        :uci-section="s"
        :depend="s.username === currentUsername"
        name="current_password"
        password
        :label="$t('Current password')"
        :help="$t('Enter your current user password.')"
        rules="string"
        :required="isPaswordFieldsRequired"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="password"
        password
        :label="$t('New password')"
        maxlength="256"
        :rules="v => [v.renew_password.bind(v, $store.passwordPolicy), isMatchingOldPassword]"
        :minlength="$store.passwordPolicy.password_length"
        :required="isPaswordFieldsRequired"
        :can-randomize="{ length: Math.max(16, Number($store.passwordPolicy.password_length)) }"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="password_confirm"
        password
        :label="$t('Confirm new password')"
        maxlength="256"
        :minlength="$store.passwordPolicy.password_length"
        :rules="v => [v.renew_password.bind(v, $store.passwordPolicy), isMatchingPasswords]"
        :required="isPaswordFieldsRequired"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="group"
        :readonly="isUserInRoot"
        :label="$t('Group')"
        :help="$t('A group to which the current user belongs.')"
        :options="groupOptions"
        :no-write="isAdmin"
        :depend="isUserEdit"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="ssh_enable"
        :label="$t('Enable SSH access')"
        prop="ssh_enable"
        :depend="isUserEdit && section.group === 'root'"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { formBus } from '@ui-core/vuci-form'

export default {
  provide() {
    return {
      noValidate: () => this.noValidate
    }
  },
  props: {
    section: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      formModel: {},
      passChangeErrors: {
        1: this.$t('Wrong current password. Password not changed.'),
        5: this.$t("Can not change other user's password."),
        6: this.$t('Password is the same. Use a different new password.'),
        default: this.$t('Unexpected error occurred')
      },
      noValidate: false
    }
  },
  computed: {
    groupOptions() {
      const options = this.formModel.groups?.filter(group => group.id !== 'root').map(group => group.id) || []
      if (this.isAdmin) {
        options.push('root')
      }
      return options
    },
    currentSection() {
      return this.isUserEdit ? this.section : this.currentUserSection
    },
    isUserInRoot() {
      return this.currentSection.group === 'root'
    },
    currentUsername() {
      return this.$store.username || ''
    },
    currentUserSection() {
      if (!this.formModel.users || this.formModel.users.length === 0) return {}
      return this.formModel.users.find(user => user.username === this.currentUsername)
    },
    // either is user edit or current user password change
    isUserEdit() {
      return !!this.section.username
    },
    isAdmin() {
      return this.currentSection.username === 'admin'
    },
    isPaswordFieldsRequired() {
      const isPasswordChangeOnlyAction = this.isPasswordChangeOnlyAction()
      const isPaswordFieldFilled = this.isPaswordFieldFilled()
      return isPasswordChangeOnlyAction || isPaswordFieldFilled
    }
  },
  methods: {
    checkPasswordPolicy() {
      return this.$axios
        .get('/api/password_policy/config')
        .then(({ data }) => {
          this.$store.passwordPolicy = data[0]
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load password policy data'))
        })
    },
    afterSave(self, res) {
      this.checkPasswordPolicy()
      this.noValidate = true
      formBus.once('forms-applied-api', () => {
        this.noValidate = false
      })
      Object.keys(self.forms[res.data.id]).forEach(property => {
        self.forms[res.data.id][property].initialValue = ''
      })
    },
    isPasswordChangeOnlyAction() {
      return (this.isAdmin && !!this.currentSection.current_password) || !this.isUserEdit
    },
    isPaswordFieldFilled() {
      return !!(this.currentSection.password || this.currentSection.password_confirm)
    },
    handleError() {
      return { edit: e => this.parsePassChangeError(e.data.errors[0].code) }
    },
    parsePassChangeError(errorCode) {
      return this.passChangeErrors[errorCode] || this.passChangeErrors.default
    },
    isMatchingPasswords() {
      if (this.currentSection.password === this.currentSection.password_confirm) {
        return { isValid: true }
      } else {
        return {
          isValid: false,
          message: this.$t('New password confirmation must match new password')
        }
      }
    },
    isMatchingOldPassword() {
      return {
        isValid: this.currentSection.current_password !== this.currentSection.password,
        message: this.$t('New password must be different from your current password')
      }
    }
  }
}
</script>
