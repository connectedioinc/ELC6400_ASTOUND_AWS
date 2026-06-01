<template>
  <vuci-form
    v-slot="{ uciData }"
    config="privoxy"
  >
    <vuci-named-section
      v-slot="{ s }"
      name="general"
      :title="$t('Proxy based URL content blocker configuration')"
      :help="
        $t(`The proxy based content blocker service provides you with the possibility to create a Blocklist or Allowlist that filters out which websites users on the local network can access %s \
      Instead of having to block multiple domains like website.com, website.net, website.org you can simply create an entry called website.*, which would block all websites whose names begin with website. This service cannot be used to block HTTPS websites. For HTTPS, use Site Blocking instead.`).format(
          '<br>'
        )
      "
      rawhtml
      :uci-data="uciData"
      data-key="privoxy"
      :endpoints="[{ endpoint: 'webfilter/privoxy/config' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Turns proxy based content blocker on or off.')"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="mode"
        :label="$t('Mode')"
        :help="
          $t(`Mode of operation %s \
        Allowlist - allow every site included in the list and block everything else %s \
        Blocklist - block every site included in the list and allow everything else.`).format('<br>', '<br>')
        "
        :options="listOptions"
        initial="blacklist"
        rawhtml
      />
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('URL content')"
        :help="$t('This section contains names of hosts that will be added to the Blocklist or Allowlist.')"
        name="url"
        rules="string"
        placeholder="example.com"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      listOptions: [
        ['whitelist', this.$t('Allowlist')],
        ['blacklist', this.$t('Blocklist')]
      ]
    }
  }
}
</script>
