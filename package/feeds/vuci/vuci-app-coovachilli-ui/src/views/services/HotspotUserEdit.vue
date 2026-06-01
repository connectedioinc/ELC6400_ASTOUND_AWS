<template>
  <vuci-form
    v-slot="{ uciData }"
    config="chilli"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :name="section.id"
      :title="$t('&quot;%s&quot; user settings').format(section.username)"
      :endpoints="[{ endpoint: 'hotspot/users/config' }]"
      data-key="users"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="password"
        :label="$t('Password')"
        :help="$t('Change the current password.')"
        rules="credentials_validate"
        maxlength="512"
        password
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="group"
        :label="$t('Group')"
        :options="groups()"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script>
export default {
  inject: ['groups'],
  props: {
    section: {
      type: Object,
      required: true
    }
  }
}
</script>
