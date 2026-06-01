<template>
  <router-link
    class="no-underline hover:text-theme-text-primary! visited:text-theme-text-secondary block opacity-75 hover:opacity-100 transition-[opacity,background-color]"
    :to="path"
  >
    <div class="font-semibold px-3 py-2 rounded-lg hover:bg-theme-bg-primary-subtle-hover">
      {{ name }}
    </div>
  </router-link>
</template>

<script>
export default {
  props: {
    path: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  }
}
</script>

<style scoped>
@reference '@/theme.css';

a {
  @apply text-theme-text-secondary;
}
.router-link-active {
  @apply text-theme-text-primary bg-theme-bg-primary-subtle-active opacity-100;
}
</style>
