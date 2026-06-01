<template>
  <div
    class="p-4 md:p-12 border rounded-lg border-theme-border-base grid place-items-center"
    test-id="404"
  >
    <div class="text-theme-text-primary flex items-center w-max mx-auto gap-1">
      <h2 class="text-404">404</h2>
      <h3 class="w-min text-not-found mt-2">{{ $t('PAGE NOT FOUND') }}</h3>
    </div>
    <p class="text-theme-text-secondary-subtle text-path mx-auto text-center">
      {{ $t('Your requested path:') }}
    </p>
    <p class="text-theme-text-secondary-subtle text-path mx-auto text-center mb-4 break-all">{{ $route?.redirectedFrom?.path || '-' }}</p>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  layout: 'none'
})
</script>

<style scoped>
.text-404 {
  font-size: clamp(5rem, 10vw, 14rem);
  line-height: normal;
}

.text-not-found {
  font-size: clamp(1.5rem, 2.85vw, 3.75rem);
  line-height: clamp(1.75rem, 2.75vw, 4.25rem);
}

.text-path {
  font-size: clamp(1rem, 1.5vw, 1.5rem);
  line-height: normal;
}
</style>
