<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="samba"
  >
    <vuci-typed-section
      :uci-data="uciData"
      :title="$t('Users')"
      type="user"
      :columns="usersColumns"
      :exception-options="['password']"
      :edit-form="SambaUsersEditModal"
      :endpoints="[{ endpoint: 'samba/users/config' }]"
      data-key="users"
      no-edit-after-create
      :add-validate="addSection"
      :form-methods="['create', 'get', 'delete']"
      :add-title="$t('Add new user')"
      :error-handlers="{ create: returnErrorMessage }"
    >
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.username"
          :label="$t('Name')"
          prop="username"
          maxlength="8"
          required
          :rules="[isNotDublicate, sambaCredentialsValidate]"
        />
        <tlt-form-item-password
          v-model="addModel.password"
          :label="$t('Password')"
          prop="password"
          maxlength="130"
          minlength="8"
          required
          rules="root_password"
          can-randomize
        />
      </template>
      <template #username="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="username"
          no-write
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import SambaUsersEdit from './SambaUsersEdit'

export default {
  data() {
    return {
      formData: {},
      SambaUsersEditModal: markRaw(SambaUsersEdit),
      usersColumns: [{ name: 'username', label: this.$t('Username') }],
      errors: {
        1: this.$t('Failed to create new system user.'),
        2: this.$t('Failed to set new user password.'),
        3: this.$t('Username is reserved'),
        4: this.$t('Username already in use.')
      }
    }
  },
  methods: {
    returnErrorMessage(err) {
      const errorCode = err.data.errors[0].code
      return this.errors[errorCode] || this.$t('Unexpected error')
    },
    addSection(addForm) {
      const usernameExists = this.formData.users.some(user => user.username === addForm.username)
      if (usernameExists) return { message: this.$t('User with username %s already exists').format(addForm.username), valid: false }
      else return { valid: true }
    },
    isNotDublicate(username) {
      if (this.formData.users.some(e => e.username === username)) {
        return {
          isValid: false,
          message: this.$t('User with this username already exists')
        }
      }
      return { isValid: true }
    },
    sambaCredentialsValidate(value) {
      if (!value.match(/^[a-z_].*/)) {
        return {
          isValid: false,
          message: this.$t("Username must start with a lower case character or '_'")
        }
      }
      if (!value.match(/^[a-z0-9_-]+$/)) {
        return {
          isValid: false,
          message: this.$t("Username can only contain lower case alphanumeric characters and '_' or '-'")
        }
      }
      return { isValid: true }
    }
  }
}
</script>
