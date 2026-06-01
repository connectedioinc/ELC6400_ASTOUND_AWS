<template>
  <vuci-form
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="landingpage"
    :after-load="loadData"
  >
    <vuci-named-section
      v-if="hasCoovachilli"
      v-slot="{ s }"
      :uci-data="uciData"
      name="general"
      :endpoints="[{ endpoint: 'hotspot/themes/global' }]"
      data-key="landingPage"
      :title="$t('General settings')"
      :after-save="setCurrentTheme"
    >
      <vuci-form-item-select
        :uci-section="s"
        name="theme"
        :label="$t('Theme')"
        :help="$t('Currently active theme. More themes can be installed using the Package Manager.')"
        :options="themeOptions"
      />
    </vuci-named-section>
    <vuci-typed-section
      ref="section"
      type="theme"
      :title="$t('Themes')"
      :uci-data="uciData"
      :columns="cols"
      :endpoints="[{ endpoint: 'hotspot/themes/config' }]"
      :form-methods="['get', 'delete']"
      data-key="themes"
      :edit-form="HotspotLandingpageEdit"
      :row-actions="
        s => [
          'edit',
          {
            id: 'delete',
            buttonProps: { disabled: s.id === currentTheme || s.id === 'default' || (!hasCoovachilli && s.custom === '0') },
            callback: () => deleteTheme(s)
          }
        ]
      "
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #status="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="active"
          :display-value="() => (s.id === currentTheme ? $t('Active') : $t('Inactive'))"
          :class="s.id === currentTheme ? 'success' : 'error'"
        />
      </template>
      <template #export="{ s }">
        <tlt-button
          button-id="export"
          type="text"
          size="md"
          icon-left="download-import"
          action="add"
          @click="downloadTheme(s.id)"
          >{{ $t('Download theme') }}</tlt-button
        >
      </template>
    </vuci-typed-section>
    <tlt-card :title="$t('Add custom theme')">
      <tlt-form-model-item :label="$t('Upload custom theme')">
        <tlt-upload
          ref="uploader"
          name="custom_theme"
          action="/api/hotspot/themes/config"
          instant
          :errors="uploadErrors"
          @uploaded="afterPackageUpload"
        />
      </tlt-form-model-item>
    </tlt-card>
  </vuci-form>
</template>
<script>
import { markRaw } from 'vue'
import HotspotLandingpageEdit from './HotspotLandingpageEdit'

export default {
  data() {
    return {
      formData: {},
      themeRequests: [],
      themeNames: [],
      sections: {},
      HotspotLandingpageEdit: markRaw(HotspotLandingpageEdit),
      currentTheme: '',
      defaultImageData: [
        {
          type: 'file',
          path: '',
          file_name: 'Logo',
          file_path: '<%=logo%>',
          name: 'logo.svg'
        },
        {
          type: 'file',
          file_name: 'Favicon',
          file_path: '<%=favicon%>',
          name: 'favicon.svg'
        },
        {
          type: 'file',
          path: '',
          file_name: 'Background',
          file_path: '<%=background%>',
          name: 'background.svg'
        },
        {
          type: 'file',
          path: '',
          file_name: 'Loading',
          file_path: '<%=loading%>',
          name: 'loading.gif'
        }
      ],
      uploadErrors: {
        1: this.$t('Invalid file'),
        4: this.$t('Invalid custom theme file'),
        7: this.$t('Limit reached, 5 custom themes are allowed'),
        150: this.$t('Not enough free space in RAM'),
        default: this.$t('Package installation failed')
      }
    }
  },
  computed: {
    /**
     * @description Function maps available themes
     * @return {array} - mapped theme option array
     */
    themeOptions() {
      return this.formData.themes.map(theme => [theme.id, theme.name])
    },
    hasCoovachilli() {
      return this.$store.hasPackages('vuci-app-coovachilli-ui')
    },
    cols() {
      const cols = [
        { name: 'name', label: this.$t('Name') },
        { name: 'export', label: this.$t('Download') }
      ]
      if (this.hasCoovachilli) cols.push({ name: 'status', label: this.$t('Status') })
      return cols
    }
  },
  methods: {
    deleteTheme(s) {
      this.$prompt.show({
        title: s.custom === '1' ? this.$t('Are you sure you want to delete "%s" theme?').format(s.name) : this.$t('Remove "Hotspot landing page %s" package?').format(s.name),
        content:
          s.custom === '1'
            ? this.$t('"%s" theme will be removed.').format(s.name)
            : this.$t('Once you remove the package, it will delete additional software from the device. A package can be re-installed to the device.'),
        okText: this.$t('Delete'),
        cancelText: this.$t('Cancel'),
        onOk: () => this.onOk(s),
        onCancel: () => {}
      })
    },
    async onOk(s) {
      this.$spin()
      try {
        await this.handleApiRequest(s)
        this.handleUIUpdates()
        this.$message.success(this.$t('Theme deleted successfully'))
      } catch (error) {
        this.$message.error(this.$t('Failed to remove theme'))
      } finally {
        this.$spin(false)
      }
    },
    async handleApiRequest(s) {
      if (s.custom === '1') {
        await this.$axios.delete(`/api/hotspot/themes/config/${s.id}`)
      } else {
        await this.$axios.post('/api/package_manager/actions/remove_package', { data: { package: `hs_theme_${s.id}` } })
      }
    },
    async handleUIUpdates() {
      this.themeRequests = []
      this.themeNames = []
      await this.$refs.section.reloadData()
    },
    downloadTheme(id) {
      this.$spin()
      return this.$utils
        .downloadFileApi(`/api/hotspot/themes/${id}/actions/download`, 'application/x-targz', 'POST', null, true)
        .then(() => {
          this.$message.success(this.$t('Theme download was successful'))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to download theme'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    setCurrentTheme() {
      this.currentTheme = this.formData.landingPage[0].theme
    },
    /**
     * @description Function maps api requests for current themes
     * @param {object} form - current uciData
     * @return {array} - theme api requests
     */
    generateRequests(form) {
      const requests = form.themes?.map(theme => '/api/hotspot/images/config/' + theme.id)
      requests?.unshift('/api/hotspot/themes/options')
      return requests
    },
    /**
     * @description Function maps theme files for different data keys
     * @param {array} files - available file array
     * @param {string} type - data key to map to
     * @return {array} - filtered file list
     */
    fileFilter(files, type) {
      if (type === 'style') return files.filter(file => file.file === 'landing_page.css')
      return files.filter(file => file.file !== 'landing_page.css')
    },
    /**
     * @description Function maps api requests for all available themes
     * @param {array} files - available file array
     * @param {array} themes - available theme array
     */
    generateFileRequests(files, themes) {
      themes.forEach(theme => {
        files.forEach(file => {
          if (file.file === 'landing_page.css') {
            this.themeRequests.push(`/api/hotspot/themes/${theme.id}/config/css`)
          } else {
            this.themeRequests.push(`/api/hotspot/themes/${theme.id}/config/${file.file.slice(0, -4)}`)
          }
        })
        this.themeNames.push(theme.id)
      })
    },
    /**
     * @description Function displays error message and returns base file data
     * @param {string} name - theme name
     * @param {string} file - file name
     * @return {sring} - base file value
     */
    error(name, file) {
      this.$message.error(this.$t('Failed to load %s themes %s file data').format(name, file))
      return ''
    },
    /**
     * @description Function loads all theme data
     * @param {object} form - current uciData
     * @return {object} - updated uciData
     */
    loadData(form) {
      return this.$axios
        .bulkGet(this.generateRequests(form))
        .then(res => {
          if (this.hasCoovachilli) {
            this.currentTheme = form.landingPage[0].theme
          }
          const files = res.shift()
          res.forEach((response, index) => {
            const sectionID = form.themes[index].id
            if (response.success) {
              this.sections[`${sectionID}_themeImage`] = this.defaultImageData.map(data => {
                if (response.data.some(dat => dat.file_name === data.file_name)) return { id: `${sectionID}_${data.file_name}`, ...response.data.find(resp => resp.file_name === data.file_name) }
                else return { id: `${sectionID}_${data.file_name}`, ...data }
              })
            } else {
              this.$message.error(this.$t('Failed to load %s themes image.').format(sectionID))
            }
          })
          this.sections.style = files.success ? this.fileFilter(files.data, 'style') : []
          this.sections.views = files.success ? this.fileFilter(files.data, 'view') : []
          return this.generateFileRequests(files.data, form.themes)
        })
        .then(() => {
          const uniqueThemeRequests = [...new Set(this.themeRequests)]
          return this.$axios.bulkGet(uniqueThemeRequests)
        })
        .then(res => {
          // puts responses in 10 element chunks, since each theme has 10 editable files
          const chunk = (arr, splitBy, cache = []) => {
            const tmp = [...arr]
            while (tmp.length) cache.push(tmp.splice(0, splitBy))
            return cache
          }
          const response = chunk(res, 11)
          const names = [
            ['css', 'landing page'],
            ['header', 'header'],
            ['login', 'login'],
            ['login_mac', 'login mac'],
            ['otp_login', 'otp login'],
            ['signup', 'signup'],
            ['otp_signup', 'otp signup'],
            ['success', 'success'],
            ['access_denied', 'access denied'],
            ['tos', 'tos'],
            ['login_sso', 'login sso']
          ]
          const uniqueNames = [...new Set(this.themeNames)]
          uniqueNames.forEach((name, index) => {
            response[index].forEach((data, i) => {
              data.data.name = names[i][0]
              this.sections[`${name}-${names[i][0]}`] = data.success ? [data.data] : this.error(name, names[i][1])
            })
          })
          return this.sections
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load data'))
        })
    },
    updateTableData() {
      this.sections = Object.assign({}, this.sections, this.$refs.vuciForm?.uciData)
      this.$refs.vuciForm.updateUciData(this.sections)
      this.$refs.vuciForm.initialForm = this.sections
      this.loadData(this.sections)
    },
    async afterPackageUpload({ res }) {
      this.$spin()
      if (res.success) {
        this.$refs.uploader.resetInput()
        this.$spin(false)
        await this.$refs.section.reloadData()
        this.updateTableData()
        return this.$message.success(this.$t('Theme uploaded successfully'))
      }
      this.$spin(false)
      return this.$message.error(this.$t('Failed to upload theme'))
    }
  }
}
</script>
