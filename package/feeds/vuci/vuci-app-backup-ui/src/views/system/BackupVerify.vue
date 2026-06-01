<template>
  <verify-modal
    id="backup"
    :open="open"
    :title="$t('File \'%s\' was successfully uploaded').format(data?.file?.name || '')"
    :message="$t('Click \'%s\' to start the installation process.').format($t('Proceed'))"
    @proceed="$emit('proceed')"
    @cancel="$emit('cancel')"
    @close="$emit('cancel')"
  >
    <status-row
      :has-accordion="!matches"
      :header="$t('Backup security check')"
      status="info"
      icon="validation"
      name="validation"
    >
      <template #content>
        {{ $t('Please compare checksums listed below with the original file to ensure data integrity.') }}
        <collapsable-list
          :items="[
            { label: 'MD5', value: data.res.data.md5 },
            { label: 'SHA256', value: data.res.data.sha256 }
          ]"
          :expand-text="$t('Show checksums')"
          :collapse-text="$t('Hide checksums')"
        />
      </template>
    </status-row>
    <div class="flex flex-col gap-4">
      <tlt-alert
        type="warning"
        :text="$t('If checksums do not match - proceed installation process at your own risk.')"
        inline
      />
      <tlt-alert
        type="info"
        :text="
          $t('After backup, the user interface will be redirected to local %s address from backup configuration. The device will then reboot and be temporarily unreachable.').format(
            $store.isSwitch ? '' : 'LAN'
          )
        "
        inline
      />
    </div>
  </verify-modal>
</template>

<script>
import { useMediaQuery } from '@vueuse/core'
import StatusRow from '@ui-core/tlt-design/customComponents/StatusRow.vue'
import TltAlert from '@/components/Messenger/TltAlert.vue'
import CollapsableList from '@/components/CollapsableList.vue'
import VerifyModal from '@/components/VerifyModal.vue'

export default {
  components: {
    StatusRow,
    TltAlert,
    VerifyModal,
    CollapsableList
  },
  props: {
    open: {
      type: Boolean,
      default: false
    },
    data: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['cancel', 'proceed'],
  setup() {
    const matches = useMediaQuery('(min-width: 1024px)')
    return { matches }
  }
}
</script>
