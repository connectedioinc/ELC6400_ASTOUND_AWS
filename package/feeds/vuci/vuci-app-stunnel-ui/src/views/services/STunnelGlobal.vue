<template>
  <vuci-form
    v-slot="{ uciData }"
    editing
    config="stunnel"
  >
    <vuci-named-section
      v-slot="{ s }"
      name="globals"
      :title="$t('Stunnel global settings')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'stunnel/global' }]"
      data-key="global"
      :after-save="afterSave"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enabled')"
        :help="$t('Enable service.')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Debug Level')"
        :help="
          $t(
            'Level of output to log:\
        emerg (0), alert (1), crit (2), err (3),\
        warning (4), notice (5), info (6), or debug (7)'
          )
        "
        name="debug"
        placeholder="5"
        initial="5"
        rules="range(0,7)"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Use alternative config')"
        :help="`${$t('Enable alternative configuration option (Config upload).')} <br> *
        ${$t('Be aware that when using alternative configuration, all configurations in \'Stunnel Configuration\' section will be skipped.')}`"
        name="use_alt"
        rawhtml
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="alt_config_file"
        :label="$t('Upload alternative config')"
        endpoint="/api/stunnel/global"
        :depend="s.use_alt === '1'"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  inject: ['form'],
  methods: {
    afterSave(_, form) {
      if (form.data.enabled === '0') this.form().stunnels.forEach(stunnel => (stunnel.enabled = '0'))
    }
  }
}
</script>
