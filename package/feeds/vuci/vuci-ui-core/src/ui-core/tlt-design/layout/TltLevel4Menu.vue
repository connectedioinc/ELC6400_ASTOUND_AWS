<template>
  <div>
    <div class="tab-navigation">
      <button
        v-for="tab in tabs"
        :key="tab.index"
        class="tab-item"
        :class="{ active: tab.route === $route.meta.route }"
        :disabled="$route.path === tab.path"
        @click="$router.push(tab.path)"
      >
        {{ tab.title }}
      </button>
    </div>
    <slot />
  </div>
</template>

<script>
export default {
  props: {
    tabs: {
      type: Array,
      default: () => []
    }
  }
}
</script>

<style scoped>
.tab-navigation {
  display: flex;
  width: 100%;
  justify-content: space-around;
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
  text-transform: uppercase;
}

.tab-item {
  cursor: pointer;
  font-size: 1.333em;
  flex-grow: 1;
  text-align: center;
  padding: 0.5em 0;
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
  border-bottom: 1px solid var(--color-theme-border-base);

  &.active {
    color: var(--color-theme-border-primary);
    border: 1px solid var(--color-theme-border-base);
    border-bottom: none;
  }
}

button {
  all: unset;
  cursor: pointer;
}
</style>
