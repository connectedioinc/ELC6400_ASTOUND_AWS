<template>
  <tlt-form-accordion
    name="parameter-list"
    :title="title"
  >
    <tlt-form-model-item>
      <t-parameters class="w-full">
        <strong>{{ capitalize(title) }}:</strong>
        <t-parameters-list>
          <t-parameters-list-item
            v-for="param in formattedParameters"
            :key="param.parameter"
            v-bind="param"
          />
        </t-parameters-list>
      </t-parameters>
    </tlt-form-model-item>
  </tlt-form-accordion>
</template>
<script setup lang="ts">
import { capitalize } from '@ui-core/plugins/helper'

interface ParameterProps {
  listParameters: string[][]
  title: string
}

const props = defineProps<ParameterProps>()

const formattedParameters = props.listParameters.map(params => ({ parameter: `%${params[0]}`, description: params[1] }))
</script>
