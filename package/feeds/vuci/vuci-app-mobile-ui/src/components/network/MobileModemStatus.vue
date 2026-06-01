<template>
  <div
    v-if="simSlots.length"
    class="flex justify-center"
  >
    <ListLayout
      class="relative border border-theme-border-subtle rounded-sm p-4 flex flex-wrap justify-center"
      gap="none"
      bordered
    >
      <div
        v-for="sim of simSlots"
        :key="sim.id"
        :test-id="`simstatus_${sim.id}`"
        class="cursor-default mb-2"
        :class="{ 'px-3': simSlots.length === 1 }"
      >
        <div class="flex mb-1 justify-center">
          {{ sim.esim_profile ? 'eSIM' : 'SIM' }}
        </div>
        <button
          class="relative text-center border border-theme-border-subtle pb-1 px-3"
          @click="updateRadio(sim.id)"
        >
          <div class="absolute top-0 left-0">
            <slot
              name="left-side"
              :sim="sim"
            />
          </div>
          <div
            :id="`simstatus_${sim.id}`"
            class="relative hover:scale-110"
          >
            <tlt-icon
              icon="sim-solid"
              class="size-12"
              :class="checkActiveSim(sim) ? 'text-theme-text-success' : 'text-theme-text-subtle'"
            />
            <span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-medium text-theme-text-on-primary">
              {{ simNumber(sim) }}
            </span>
          </div>
          <tlt-check-box
            v-if="selectable"
            :model-value="selectedSim === sim.id"
            class="absolute top-1 right-1"
            :custom-id="`option-${sim.id}`"
            type="radio"
            size="sm"
          />
          <span
            v-if="checkDefaultSim(sim)"
            class="absolute z-10 bg-theme-border-base rounded-full px-1 leading-3 text-[0.5rem] -translate-x-1/2 -mt-0.5 text-theme-text-base min-w-0 max-w-full truncate"
          >
            {{ $t('Default SIM') }}
          </span>
          <tlt-popover
            v-if="hintInfo(sim).length"
            :target="`#simstatus_${sim.id}`"
            placement="bottom-start"
          >
            <ul>
              <li
                v-for="info of hintInfo(sim)"
                :key="info.id"
              >
                <b>{{ info.title }}:</b> <span :class="info.class">{{ info.value }}</span>
                <template v-if="info.list && info.list.length > 1">
                  <ul class="list-disc pl-5">
                    <li
                      v-for="item in info.list"
                      :key="item.label"
                    >
                      {{ item.label }}: <span :class="item.class">{{ item.value }}</span>
                    </li>
                  </ul>
                </template>
              </li>
            </ul>
          </tlt-popover>
        </button>
      </div>
      <div class="absolute mx-auto left-0 right-0 text-center -bottom-2 w-max px-2 bg-theme-bg-surface text-xs font-semibold tracking-wide">
        {{ modemName }}
      </div>
    </ListLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { mobile } from '@/plugins/mobile'
import type { ModemInfo, SimcardConfig } from '@/types/mobileTypes'

interface Props {
  simSlots: Array<SimcardConfig>
  modemStatus: ModemInfo
  simcards: Array<SimcardConfig>
  hintInfo: (sim: SimcardConfig) => Array<{ id: string; title: string; value: string; class?: string; list?: Array<{ label: string; value: string; class?: string }> }>
  selectable?: boolean
  initialSelected?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectable: false,
  initialSelected: ''
})

const selectedSim = defineModel<string>({ default: '' })

watch(
  () => props.initialSelected,
  val => {
    if (!selectedSim.value && val) {
      selectedSim.value = val
    }
  }
)

const emit = defineEmits<{
  selected: [string]
}>()

const $t = useTranslate()

const modemName = computed(() => {
  return mobile.shouldShowModemName(props.modemStatus) ? props.modemStatus.name : $t('Modem')
})

function checkActiveSim(sim: SimcardConfig) {
  const checkEsim = !sim.esim_profile || props.modemStatus.esim_profile === sim.esim_profile
  return props.modemStatus.active_sim === Number(sim.position) && checkEsim
}

function checkDefaultSim(sim: SimcardConfig) {
  return props.simcards.some(s => s.primary === '1' && s.modem === props.modemStatus.id && s.position === sim.position && s.esim_profile === sim.esim_profile)
}

function simNumber(sim: SimcardConfig) {
  return sim.esim_profile ? sim.esim_profile : mobile.adjustSimNumber(Number(sim.position), sim.modem)
}

function updateRadio(id: string) {
  if (!props.selectable) return
  selectedSim.value = id
  emit('selected', id)
}
</script>
