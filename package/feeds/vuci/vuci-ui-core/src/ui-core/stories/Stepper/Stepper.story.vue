<template>
  <div>
    <Steps.Root
      :steps="['first', 'second', 'third']"
      :initial-step="'second'"
    >
      <Steps.List />
      <Steps.Content value="first">Content of first</Steps.Content>
      <Steps.Content value="second">Content of second</Steps.Content>
      <Steps.Content value="third">Content of third step!!!</Steps.Content>
      <Steps.Next />
      <Steps.Prev />
    </Steps.Root>
  </div>
</template>

<script setup lang="ts">
import { Steps } from '@ui-core/components/steps'
</script>
