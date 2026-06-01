<template>
  <vuci-form
    v-slot="{ uciData }"
    config="landingpage"
    editing
  >
    <vuci-typed-section
      :uci-data="uciData"
      :title="$utils.getModalTitle($t('images'), section.name)"
      :help="$t('Here you can upload custom images for different objects.')"
      :columns="imgColumns"
      :endpoints="[{ endpoint: 'hotspot/images/config/' + section.id, sectionFilter: section => section }]"
      :data-key="`${section.id}_themeImage`"
      :form-methods="['get', 'edit']"
      section-id="file_name"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="file_name"
        />
      </template>
      <template #image="{ s }">
        <vuci-form-item-upload
          name="path"
          :option="s['file_name']"
          :uci-section="s"
          :endpoint="'/api/hotspot/images/config/' + section.id"
        />
      </template>
      <template #path="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="file_path"
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      :title="$t('Style settings')"
      :help="$t('Using CSS you can customize how the landing page looks.')"
      :columns="columns"
      :uci-data="uciData"
      :endpoints="[
        {
          endpoint: 'hotspot/themes/options',
          sectionFilter: sections => sections.file === 'landing_page.css'
        }
      ]"
      data-key="style"
      section-id="file"
      :form-methods="['get']"
      :edit-form="HotspotFileEdit"
      :edit-form-props="{
        theme: section.id,
        resettable: section.custom !== '1'
      }"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="file"
          :display-value="value => loadDisplayValue(value, 'name')"
        />
      </template>
      <template #desc="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="file"
          :display-value="value => loadDisplayValue(value, 'desc')"
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      :title="$t('View settings')"
      :help="$t('Here you can access default templates for Header, Login, Signup, Success, TOS and Denied pages and edit their HTML code.')"
      :columns="columns"
      :uci-data="uciData"
      :endpoints="[
        {
          endpoint: 'hotspot/themes/options',
          sectionFilter: sections => sections.file !== 'landing_page.css'
        }
      ]"
      data-key="views"
      section-id="file"
      :form-methods="['get']"
      :edit-form="HotspotFileEdit"
      :edit-form-props="{
        theme: section.id,
        resettable: section.custom !== '1'
      }"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="file"
          :display-value="value => loadDisplayValue(value, 'name')"
        />
      </template>
      <template #desc="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="file"
          :display-value="value => loadDisplayValue(value, 'desc')"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import { markRaw } from 'vue'
import HotspotFileEdit from './HotspotFileEdit'

export default {
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      displayValues: [
        {
          name: this.$t('Style'),
          description: this.$t('File contains all CSS style rules'),
          file: 'landing_page.css'
        },
        {
          name: this.$t('Header'),
          description: this.$t('HTML header template'),
          file: 'header.htm'
        },
        {
          name: this.$t('Login'),
          description: this.$t('Login page template'),
          file: 'login.htm'
        },
        {
          name: this.$t('Login (MAC auth)'),
          description: this.$t('MAC authentication login page template'),
          file: 'login_mac.htm'
        },
        {
          name: this.$t('Single sign-on'),
          description: this.$t('Single sign-on login page template'),
          file: 'login_sso.htm'
        },
        {
          name: this.$t('Login (SMS OTP)'),
          description: this.$t('SMS OTP login page template'),
          file: 'otp_login.htm'
        },
        {
          name: this.$t('Signup'),
          description: this.$t('Signup page template'),
          file: 'signup.htm'
        },
        {
          name: this.$t('Signup (SMS OTP)'),
          description: this.$t('SMS OTP signup page template'),
          file: 'otp_signup.htm'
        },
        {
          name: this.$t('Success'),
          description: this.$t('Success page template'),
          file: 'success.htm'
        },
        {
          name: this.$t('Denied'),
          description: this.$t('Access denied page template'),
          file: 'access_denied.htm'
        },
        {
          name: this.$t('TOS'),
          description: this.$t('Terms of Service'),
          file: 'tos.htm'
        }
      ],
      imgColumns: [
        { name: 'name', label: this.$t('Name') },
        { name: 'image', label: this.$t('Image') },
        { name: 'path', label: this.$t('File path') }
      ],
      columns: [
        { name: 'name', label: this.$t('Name') },
        { name: 'desc', label: this.$t('Description') }
      ],
      HotspotFileEdit: markRaw(HotspotFileEdit)
    }
  },

  methods: {
    loadDisplayValue(val, type) {
      const filteredValue = this.displayValues.find(value => value.file === val)
      return type === 'name' ? filteredValue.name : filteredValue.description
    }
  }
}
</script>
