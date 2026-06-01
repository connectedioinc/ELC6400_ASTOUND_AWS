<template>
  <section>
    Make invalid:
    <input
      v-model="invalid"
      type="checkbox"
    />
    <div class="t-grid">
      <div></div>
      <div class="descriptor">Default</div>
      <div class="contents">
        <div class="descriptor">Default</div>
        <div class="field">
          <tlt-switch v-model="value" />
        </div>
      </div>
      <div class="descriptor">Disabled</div>
      <div class="field">
        <tlt-switch
          v-model="value"
          disabled
        />
      </div>
    </div>
  </section>
</template>

<script>
export default {
  provide() {
    return {
      valid: () => !this.invalid
    }
  },
  data() {
    return {
      value: false,
      invalid: false
    }
  }
}
</script>

<style scoped>
@reference '@/theme.css';

.t-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(10rem, max-content));
  row-gap: 1.5rem;
  column-gap: 2rem;
}
.t-grid .descriptor {
  @apply text-fish font-semibold uppercase;
}
.t-grid .field {
  @apply w-80;
}
</style>
