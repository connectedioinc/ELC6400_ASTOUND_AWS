<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="user_groups"
  >
    <vuci-typed-section
      :title="$t('Email accounts')"
      type="email"
      :columns="emailCols"
      :edit-form="editModal"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'recipients/email_users/config' }]"
      :table-actions="['search', 'column-list']"
      data-key="users"
      :restricted-values="['name']"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #senderemail="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="senderemail"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('Name')"
          prop="name"
          required
          :rules="['defaulttype', instanceExists]"
          maxlength="16"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import { markRaw } from 'vue'
import editForm from './EmailGroupEdit'

export default {
  data() {
    return {
      emailCols: [
        { name: 'name', label: this.$t('Account name') },
        { name: 'senderemail', label: this.$t('Email address') }
      ],
      formData: {},
      editModal: markRaw(editForm)
    }
  },
  methods: {
    instanceExists(val) {
      const { users } = this.formData
      const userExists = users.some(user => user.name === val)
      if (!userExists) return { isValid: true }
      return {
        isValid: false,
        message: this.$t("Email account name '%s' already exists").format(val)
      }
    }
  }
}
</script>
