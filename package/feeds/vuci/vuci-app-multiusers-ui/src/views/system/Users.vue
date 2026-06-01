<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="rpcd"
  >
    <vuci-typed-section
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'users/groups/config' }]"
      :form-methods="['get', 'create', 'delete']"
      type="group"
      data-key="groups"
      :title="$t('Groups')"
      :table-actions="['search', 'column-list']"
      :add-title="$t('Add new group')"
      :columns="groupCols"
      :edit-form="groupEdit"
      :row-actions="
        s => [
          s.id !== 'root' && {
            id: 'edit',
            label: $store.readOnlyPage ? $t('View') : $t('Edit'),
            buttonProps: { iconLeft: $store.readOnlyPage ? 'password' : 'edit' }
          },
          canDeleteGroup(s.id) && {
            id: 'delete',
            buttonProps: { disabled: s.id === 'admin' || s.id === 'root' },
            hints: $store.readOnlyPage ? [] : getDeleteHints(s.id),
            buttonProps: { readonly: !!getDeleteHints(s.id).length }
          }
        ]
      "
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.username"
          :label="$t('Group name')"
          prop="id"
          :rules="['uciname', isNotDuplicateGroupName]"
          required
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      :title="$t('Users')"
      :columns="userCols"
      type="login"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'users/config' }]"
      :form-methods="['get', 'create', 'delete']"
      data-key="users"
      :add-title="$t('Add new user')"
      :table-actions="['column-list']"
      :edit-form="userEdit"
      :after-add="afterAdd"
      :row-actions="
        s => [
          {
            id: 'edit',
            label: $store.readOnlyPage ? $t('View') : $t('Edit'),
            props: { iconLeft: $store.readOnlyPage ? 'password' : 'edit' }
          },
          s.username !== 'admin' && 'delete'
        ]
      "
      no-edit-after-create
    >
      <template #username="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="username"
        />
      </template>
      <template #group="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="group"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.username"
          :label="$t('Username')"
          prop="username"
          :rules="v => ['username', isNotDuplicateUsername]"
          required
        />
        <tlt-form-item-password
          v-model="addModel.password"
          :label="$t('Password')"
          prop="password"
          maxlength="256"
          :rules="v => [v.renew_password.bind(v, $store.passwordPolicy)]"
          required
          :can-randomize="{ length: Math.max(16, Number($store.passwordPolicy.password_length)) }"
          :minlength="$store.passwordPolicy.password_length"
        />
        <tlt-form-item-select
          v-model="addModel.group"
          :label="$t('Group')"
          :help="$t('A group to which the user belongs.')"
          prop="group"
          :options="groupOptions"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import groupEdit from './GroupEdit'
import userEdit from './UserEdit'

export default {
  data() {
    return {
      formData: {},
      groupEdit: markRaw(groupEdit),
      userEdit: markRaw(userEdit)
    }
  },
  computed: {
    groupCols() {
      return [{ name: 'name', label: this.$t('Group Name') }]
    },
    userCols() {
      return [
        { name: 'username', label: this.$t('Username') },
        { name: 'group', label: this.$t('Group') }
      ]
    },
    groupOptions() {
      return this.formData.groups?.filter(group => group.id !== 'root').map(group => group.id)
    }
  },
  methods: {
    afterAdd(added) {
      this.$message.success(this.$t("User '%s' created").format(added.username))
    },
    isNotDuplicateUsername(username) {
      const isDuplicate = this.formData.users.some(e => e.username === username)
      return isDuplicate ? { isValid: false, message: this.$t('User with this username already exists') } : { isValid: true }
    },
    isNotDuplicateGroupName(id) {
      const isDuplicate = this.formData.groups.some(e => e.id === id)
      return isDuplicate ? { isValid: false, message: this.$t('Group with this name already exists') } : { isValid: true }
    },
    getDeleteHints(id) {
      return this.formData.users.some(i => i.group === id) ? [{ info: this.$t('Cannot remove group with assigned users') }] : []
    },
    canDeleteGroup(id) {
      return !['user', 'admin', 'root'].includes(id)
    }
  }
}
</script>
