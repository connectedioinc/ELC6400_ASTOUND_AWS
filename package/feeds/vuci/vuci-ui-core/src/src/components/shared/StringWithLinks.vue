<template>
  <component :is="render" />
</template>

<script lang="ts">
export function formatLink(link: Link, text?: string) {
  return `[${text ?? ''}](${link})`
}
</script>

<script setup lang="ts">
import LinkToPage, { type Link } from './LinkToPage.vue'
import { computed, h } from 'vue'
import { log } from '@ui-core/plugins/log'

export interface Props {
  /** Use formatLink() to insert links to text e.g "check out %s page".format(formatLink('/network/lan')) */
  text: string | undefined | null
}

const props = defineProps<Props>()

const regex = /\[([^()[\]]*)\]\(([^()[\]]*)\)/g
const linkReplacement = '%link'

const parts = computed(() => {
  if (!props.text) return []
  const links = [...props.text.matchAll(regex)].map(([, text, path]) =>
    h(LinkToPage, { customName: text ? text : undefined, path: path as Link, icon: path.startsWith('http') ? 'external-link' : null, inline: true, key: path })
  )
  const replacedString = props.text.replace(regex, linkReplacement)
  const stringParts = replacedString.split(linkReplacement)
  if (stringParts.length - 1 !== links.length) {
    log(`String "${props.text} with links failed to parse"`)
    return []
  }
  return Array.from({ length: stringParts.length + links.length }, (_, i) => (i % 2 ? links[(i - 1) / 2] : stringParts[i / 2]))
})

function render() {
  return h('div', parts.value)
}
</script>
