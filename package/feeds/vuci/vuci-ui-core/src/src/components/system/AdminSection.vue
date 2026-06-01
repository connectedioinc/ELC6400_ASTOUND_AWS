<template>
  <vuci-named-section
    v-slot="{ s }"
    :uci-data="uciData"
    :endpoints="[{ endpoint: 'system/config' }]"
    data-key="settings"
    :title="title"
    :after-save="onAfterSave"
    name="general"
  >
    <vuci-form-item-select
      :uci-section="s"
      name="lang_code"
      :label="$t('Language')"
      :options="languages"
      :disabled-options="packagesReadAccess ? [] : languagePackages"
      :depend="$store.hasPackages('package-manager-api')"
      @change="selectLanguage"
    >
      <template #help>
        {{ $t('Currently active language of Web interface. To see more language options install them using the') }}
        <router-link to="/system/package_manager">
          {{ $t('Package Manager') }}
        </router-link>
        {{ $t('or connect this device to the Internet.') }}
      </template>
      <template #option="{ option }"
        ><span>{{ option.value }} </span>
        <span
          v-if="isInstalled(option) && packagesReadAccess"
          class="pending"
          >{{ ' ' + $t('(install package)') }}</span
        >
        <span
          v-else-if="isInstalled(option) && !packagesReadAccess"
          class="grey"
          >{{ ' ' + $t('(not installed)') }}</span
        >
      </template>
    </vuci-form-item-select>
    <vuci-form-item-switch
      v-if="$brand('sentryDSN')"
      :uci-section="s"
      name="data_analytics"
      :label="$t('Data analytics')"
      :help="
        $t(
          'Enables the collection of data, which is used to improve the quality and user experience of our products. \
        It includes sending information about the device and the usage of the Web interface. \
        The data is collected in compliance with the %sPrivacy policy%s.'
        ).format(`<a target='_blank' href='${$brand('privacyPolicyURL')}'>`, '</a>')
      "
      rawhtml
    />
  </vuci-named-section>
</template>
<script>
export default {
  inject: {
    setUciData: {
      default: () => {}
    }
  },
  props: {
    uciData: {
      type: Object,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    installedLanguages: {
      type: Array,
      required: true
    },
    defaultLanguage: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      allLanguages: this.$i18n.languages
    }
  },
  computed: {
    languageOptions() {
      return this.installedLanguages.map(({ name, code }) => [code, name])
    },
    languagePackages() {
      const existantLanguages = this.languageOptions.map(l => l[0])
      return this.allLanguages
        .filter(p => {
          return !existantLanguages.includes(p.code)
        })
        .map(p => {
          return [p.code, p.name]
        })
    },
    languages() {
      return [...this.languageOptions, ...this.languagePackages]
    },
    packagesReadAccess() {
      // disable not installed language select options on switch devices since they are not supported yet
      return !this.$store.isSwitch && this.$session.hasAccess('system/package_manager', 'read')
    }
  },
  methods: {
    isInstalled(option) {
      return !this.installedLanguages.some(x => x.code === option.key)
    },
    onAfterSave(_, { data }) {
      this.$spin()
      return this.$menu
        .loadMenu(true)
        .then(() => {
          if (data.data_analytics === '1') this.$analytics.enable()
          else this.$analytics.disable()
          const langFileName = this.installedLanguages.find(x => x.filename?.substring(0, 2) === data.lang_code)?.filename
          return this.$i18n.loadLang(langFileName, true, true)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to update webui settings'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    selectLanguage(self) {
      const isInstalled = this.languageOptions.some(x => x[0] === self.model)
      if (isInstalled) return
      const selectedLang = this.allLanguages.find(x => x.code === self.model)
      this.$router.push({ path: '/system/package_manager', query: { search: selectedLang.description } })
    }
  }
}
</script>
