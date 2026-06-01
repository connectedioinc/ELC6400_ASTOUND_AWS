<template>
  <tlt-card :title="$t('General')">
    <tlt-form-model-item
      :label="$t('Apply to')"
      :help="$t('Select to apply instance to')"
    >
      <div class="flex items-center">
        <tlt-check-box
          :model-value="activeMode === 'group'"
          type="radio"
          class="pr-2"
          text="group"
          no-write
          custom-id="radio-group"
          @update:model-value="() => updateRadio('group')"
        >
          <div class="p-1">
            {{ $t('Group') }}
          </div>
        </tlt-check-box>
        <tlt-check-box
          :model-value="activeMode === 'devices'"
          type="radio"
          class="pr-2"
          text="devices"
          no-write
          custom-id="radio-devices"
          @update:model-value="() => updateRadio('devices')"
        >
          <div class="p-1">
            {{ $t('Selected devices') }}
          </div>
        </tlt-check-box>
      </div>
    </tlt-form-model-item>
    <vuci-form-item-select
      :uci-section="section"
      :label="$t('Group')"
      :help="$t('Select the group for %s to be applied to.').format(sectionName)"
      name="dm_group_id"
      required
      :depend="showGroupsBox"
      :options="mappedGroups"
    />
    <vuci-form-item-select
      :uci-section="section"
      :label="$t('Devices')"
      :help="$t('Select devices for %s to be applied to.').format(sectionName)"
      name="dm_device_id"
      multiple
      required
      :depend="showDevicesBox"
      :options="mappedDevices"
    />
  </tlt-card>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  section: {
    type: Object,
    required: true
  },
  mappedGroups: {
    type: Array,
    default: () => []
  },
  mappedDevices: {
    type: Array,
    default: () => []
  },
  sectionName: {
    type: String,
    required: true
  }
})

const activeMode = ref('group')

const showGroupsBox = computed(() => activeMode.value === 'group')
const showDevicesBox = computed(() => activeMode.value === 'devices')

function updateRadio(mode) {
  activeMode.value = mode
}

// Initial state logic
if (props.section.dm_device_id && !props.section.dm_group_id) {
  activeMode.value = 'devices'
} else {
  activeMode.value = 'group'
}
</script>
