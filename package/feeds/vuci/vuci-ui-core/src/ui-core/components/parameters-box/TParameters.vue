<template>
  <TBox
    class="text-body-secondary space-y-4"
    variant="info"
  >
    <slot>
      <TParametersList v-if="props.parameters">
        <TParametersListItem
          v-for="[parameter, description] in props.parameters"
          :key="parameter"
          :parameter="parameter"
          :description="description"
        />
      </TParametersList>
    </slot>
  </TBox>
</template>

<script setup lang="ts">
import TBox from '@ui-core/components/box/TBox.vue'
import TParametersList from './TParametersList.vue'
import TParametersListItem from './TParametersListItem.vue'

export type Props = {
  parameters?: [parameter: string, description: string][]
}

const props = defineProps<Props>()
</script>
