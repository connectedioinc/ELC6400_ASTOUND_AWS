<script>
export default {
  methods: {
    isValidCondition(condition) {
      switch (condition.type) {
        case 'minute':
        case 'hour':
        case 'weekday':
        case 'monthday':
        case 'yearday':
          if (condition.ui_timetype !== '1' && !condition.value) return false
          if (condition.ui_timetype === '1' && (!condition.interval1 || !condition.interval2)) return false
          return true
        case 'io':
          if (!condition.name || !condition.state) return false
          return true
        case 'bool':
          if (!condition.conditions || !condition.operation) return false
          if (condition.conditions && condition.conditions.length < 2) return false
          return true
        case 'analog':
          if (!condition.name || !condition.not) return false
          if ((condition.name.match('adc') || condition.name.match('pwr')) && (!condition.min || !condition.max)) return false
          if (condition.name.match('acl') && !condition.acl) return false
          if (condition.name.match('acl') && condition.acl === 'current' && (!condition.min_curr || !condition.max_curr)) return false
          if (condition.name.match('acl') && condition.acl === 'percent' && (!condition.min_perc || !condition.max_perc)) return false
          return true
        default:
          return false
      }
    },
    validateConditions(allConditions, sectionConditions) {
      const conditions = allConditions.filter(condition => sectionConditions.includes(condition.ui_name))
      const badConditions = []
      for (const condition of conditions) {
        if (!this.isValidCondition(condition)) {
          badConditions.push(condition.ui_name)
        }
      }
      if (badConditions.length === 1) {
        return this.$t("Can't use this condition because it is not fully configured: %s").format(badConditions)
      }
      if (badConditions.length > 1) {
        return this.$t("Can't use these conditions because they are not fully configured: %s").format(badConditions.join(', '))
      }
    },
    isValidAction(action) {
      switch (action.type) {
        case 'email':
          if (!(action.subject && action.text && action.recipients && action.email_group)) return false
          return true
        case 'dout':
          if (!action.dest) return false
          if (action.ui_mirroring === '1' && !action.copy) return false
          if (!action.state && (!action.ui_mirroring || action.ui_mirroring === '0') && (!action.invert || action.invert === '0')) return false
          return true
        case 'http':
          if (!action.url || !action.post) return false
          if (action.ui_params === '1' && !action.text) return false
          return true
        case 'script':
          if (!action.ui_file_path) return false
          if (action.ui_file_path === 'path' && !action.path) return false
          if (action.ui_file_path === 'upload' && !action.upload) return false
          return true
        case 'profile':
          if (!action.profile) return false
          return true
        case 'rms':
          if (!action.rms_on) return false
          return true
        case 'wifi':
          if (!action.wifi_on) return false
          return true
        case 'sim_switch':
          if ((!action.flip || action.flip === '0') && !action.target) return false
          return true
        case 'sms':
          if (!action.ui_recipient_format || !action.text) return false
          if (action.ui_recipient_format === 'single' && !action.phone) return false
          if (action.ui_recipient_format === 'group' && !action.phone_group) return false
          return true
        case 'mqtt':
          if (action.tls === '1' && !action.tls_type) return false
          if (action.tls_type === 'psk' && !(action.psk && action.identity)) return false
          if (action.tls_type === 'cert' && !action.cafile) return false
          if (!action.text || !action.remote_addr || !action.remote_port || !action.keepalive || !action.qos || !action.topic) return false
          return true
        case 'reboot':
          return true
        default:
          return false
      }
    },
    validateActions(allActions, sectionActions) {
      const actions = allActions.filter(action => sectionActions.includes(action.ui_name))
      const badActions = []
      for (const action of actions) {
        if (!this.isValidAction(action)) {
          badActions.push(action.ui_name)
        }
      }
      if (badActions.length === 1) {
        return this.$t("Can't use this action because it is not fully configured: %s").format(badActions)
      }
      if (badActions.length > 1) {
        return this.$t("Can't use these actions because they are not fully configured: %s").format(badActions.join(', '))
      }
    }
  },
  render() {
    return ''
  }
}
</script>
