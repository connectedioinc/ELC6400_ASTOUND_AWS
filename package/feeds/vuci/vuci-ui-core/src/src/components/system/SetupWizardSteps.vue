<template>
  <tlt-button
    v-if="backStep"
    class="mr-2.5"
    color="secondary"
    button-id="back"
    @click="$router.push(backStep)"
  >
    {{ $t('Back') }}
  </tlt-button>
  <div class="flex justify-between w-full">
    <tlt-hint :hints="!hasOverviewPermission ? [{ info: $t('Cannot skip setup wizard setup due to limited permissions.') }] : []">
      <tlt-button
        :disabled="!hasOverviewPermission"
        button-id="skipwizard"
        @click="$router.push('/status/overview')"
      >
        {{ $t('Skip wizard') }}
      </tlt-button>
    </tlt-hint>
    <tlt-button
      v-if="props.showNext"
      :button-id="nextStep ? 'next' : 'finish'"
      @click="onNextClick"
    >
      {{ nextStep ? $t('Next') : $t('Finish') }}
    </tlt-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { menu } from '@/plugins/menu'
import { useRoute, useRouter } from 'vue-router'

type StepOption =
  | boolean
  | {
      reverse?: boolean
    }

type Props = {
  save?: () => Promise<boolean>
  back?: StepOption
  next?: StepOption
  showNext?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  save: () => Promise.resolve(true),
  back: true,
  next: true,
  showNext: true
})

const route = useRoute()
const router = useRouter()

const hasOverviewPermission = computed(() => {
  return menu.findMenuItem('/status/overview')?.read_access
})

const computeStep = (option: StepOption, reverse: boolean) => {
  return option ? menu.setupWizardNextStep(route.path, reverse) : false
}

const backStep = computed(() => computeStep(props.back, true))
const nextStep = computed(() => computeStep(props.next, false))

const onNextClick = async () => {
  const result = await props.save()
  if (!result) return
  if (nextStep.value) {
    router.push(nextStep.value)
  } else if (hasOverviewPermission.value) {
    router.push('/status/overview')
  }
}

defineExpose({
  onNextClick
})
</script>
