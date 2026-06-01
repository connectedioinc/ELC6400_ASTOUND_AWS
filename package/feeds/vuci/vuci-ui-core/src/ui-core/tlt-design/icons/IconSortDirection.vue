<template>
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11.8 6L15.9569 10.5H7.64308L11.8 6Z"
      :fill="['asc', 1, 'both'].includes(direction) ? activeColor : 'currentColor'"
    />
    <path
      d="M11.8001 18L7.64318 13.5L15.957 13.5L11.8001 18Z"
      :fill="['desc', -1, 'both'].includes(direction) ? activeColor : 'currentColor'"
    />
  </svg>
</template>

<script>
export default {
  props: {
    /**
     * @type {import('vue').PropType<'asc'|'desc'|0|1|-1|'both'>} 1 & asc highlights upper triangle, -1 & desc highlights lower triangle, 'both' will highlight both triangles.
     */
    direction: {
      type: [Number, String],
      default: null,
      validator: v => ['asc', 'desc', 'both', 0, 1, -1].includes(v)
    },
    activeColor: {
      type: String,
      default: '#0054a6'
    }
  }
}
</script>
