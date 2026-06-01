<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="bfd"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'bfd/peers/config' }]"
      :name="props.section.id"
      :title="utils.getModalTitle($t('BFD peer'), props.section.ip)"
      :uci-data="uciData"
      data-key="bfd_peer"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enabled')"
        :help="$t('Enable or disables the peer.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="ip"
        :label="$t('IP address')"
        :help="$t('Remote IP address of the device (peer) with which BFD establishes a session. This IP address identifies the neighboring router or system that BFD will monitor for liveliness.')"
        :rules="['ipaddr', () => utils.validateNoDuplicates(formData.bfd_peer, 'ip', s.ip, $t('IP address'))]"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="multihop_ip"
        :label="$t('Multihop IP address')"
        :help="
          $t(
            'Tells the BFD daemon that we should expect packets with TTL less than 254 and to listen on the multihop port. Requires to specify which IP address should be used as the source of the BFD packets.'
          )
        "
        rules="ipaddr"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="detect_multiplier"
        placeholder="3"
        rules="irange(1,255)"
        :label="$t('Detect multiplier')"
        :help="$t('Configures the detection multiplier to determine packet loss. The remote transmission interval will be multiplied by this value to determine the connection loss detection timer.')"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="profile"
        :label="$t('Profile')"
        :help="$t('Configure peer to use the profile configurations. Profile configurations can be overridden on a peer basis by specifying non-default parameters in peer configuration node.')"
        :options="profileOptions"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="receive_interval"
        placeholder="300"
        rules="irange(10,4294967)"
        :label="$t('Receive interval')"
        :help="$t('Configures the minimum interval in milliseconds that this system is capable of receiving control packets.')"
        :depend="!s.profile"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="transmit_interval"
        placeholder="300"
        rules="irange(10,4294967)"
        :label="$t('Transmit interval')"
        :help="$t('The minimum transmission interval, in milliseconds (with reduced jitter), that this system aims to use for sending BFD control packets.')"
        :depend="!s.profile"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="passive_mode"
        :label="$t('Passive mode')"
        :help="$t('Mark session as passive: a passive session will not attempt to start the connection and will wait for control packets from peer before it begins replying.')"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script lang="ts" setup>
import { useTranslate } from '@ui-core/composables/useI18n'
import { utils } from '@/plugins/utils'
import type { BFDPeerConfig, BFDProfileConfig } from '@/types/bfdTypes'
import { ref, computed } from 'vue'

const $t = useTranslate()

const props = defineProps<{ section: BFDPeerConfig }>()
const formData = ref<{ bfd_peer: BFDPeerConfig[]; bfd_profile: BFDProfileConfig[] }>({ bfd_peer: [], bfd_profile: [] })

const profileOptions = computed(() => [['', $t('-- No profile --')], ...formData.value.bfd_profile.map(profile => [profile.id, profile.name])])
</script>
