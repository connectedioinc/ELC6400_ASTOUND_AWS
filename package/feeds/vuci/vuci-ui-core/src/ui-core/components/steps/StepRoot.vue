<template>
  <ListLayout>
    <slot :ctx="ctx" />
  </ListLayout>
</template>

<script setup lang="ts" generic="T extends string">
import { provideStepsContext } from './use-steps-context'
import { useSteps } from './use-steps'
type Props<TStep> = {
  steps: TStep[]
  initialStep?: TStep
}

const props = defineProps<Props<T>>()

const ctx = useSteps(props.steps, props.initialStep)

provideStepsContext(ctx)
</script>
