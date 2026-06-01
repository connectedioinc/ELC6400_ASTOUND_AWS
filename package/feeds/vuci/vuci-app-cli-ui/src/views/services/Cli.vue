<template>
  <tlt-card :title="$t('CLI')">
    <template #title-content>
      <tlt-hint
        class="self-center leading-0"
        :hints="[
          {
            info: $t(
              '%s A command line interface (CLI) is a text-based user interface which allows to interact with your operating system. Login credentials are: %s \ %s login: root %s \ %s password: device password %s \ %s Press \'CTRL + ALT + Q\' on your keyboard to open CLI in a new tab. %s'
            ).format('<p>', '</p><br>', '<p>', '</p><br>', '<p>', '</p><br>', '<p>', '</p>')
          }
        ]"
        rawhtml
        show-icon="mobile"
      >
        <a
          :href="cliAddress"
          target="_blank"
        >
          <tlt-button
            button-id="external-link-cli"
            :disabled="false"
            type="text"
            icon="external-link"
            color="primary"
            size="md"
          />
        </a>
      </tlt-hint>
    </template>
    <div class="resize-y w-full overflow-hidden h-120 5xl:h-224">
      <iframe
        id="iframe_cli"
        class="h-full tlt-input-wrapper max-w-none bg-theme-bg-surface p-5 leading-6 text-xs"
        :src="cliAddress"
      />
    </div>
  </tlt-card>
</template>

<script>
export default {
  data() {
    return {
      cliAddress: ''
    }
  },
  created() {
    this.getAddress()
  },
  methods: {
    getAddress() {
      if (location.protocol === 'https:' && navigator.userAgent.includes('Firefox')) {
        this.$message.info(this.$t('To access CLI you need to add certificate authority file to your browser.'))
      }
      this.cliAddress = window.location.protocol + '//' + window.location.host + '/cgi-bin/cli'
    }
  }
}
</script>
