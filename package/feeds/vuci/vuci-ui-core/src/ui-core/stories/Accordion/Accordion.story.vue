<template>
  <div>
    <h3>Accordion test</h3>
    <div class="mt-12">
      <Accordion
        v-model="value"
        name="name"
        class="border rounded-md"
        :single-open="true"
      >
        <AccordionItem value="first">
          <AccordionHeader>
            <AccordionTrigger>
              <template #before> This is HEADER 1 </template>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent> This is content </AccordionContent>
        </AccordionItem>
        <AccordionItem value="2">
          <AccordionHeader
            ><AccordionTrigger>
              <template #before> This is Second accordion </template>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent> This is content 2 and it writes very interesting information </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Accordion
        v-model="value2"
        class="border rounded-md mt-12"
        name="namae"
        :single-open="false"
      >
        <AccordionItem value="1">
          <AccordionHeader
            ><AccordionTrigger>
              <template #before> This is HEADER 1 </template>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent> This is content </AccordionContent>
        </AccordionItem>
        <AccordionItem value="2">
          <AccordionHeader
            ><AccordionTrigger>
              <template #before> This is Second accordion </template>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent> This is content 2 and it writes very interesting information </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Accordion from '@ui-core/tlt-design/layout/accordion/Accordion.vue'
import AccordionContent from '@ui-core/tlt-design/layout/accordion/AccordionContent.vue'
import AccordionHeader from '@ui-core/tlt-design/layout/accordion/AccordionHeader.vue'
import AccordionItem from '@ui-core/tlt-design/layout/accordion/AccordionItem.vue'
import AccordionTrigger from '@ui-core/tlt-design/layout/accordion/AccordionTrigger.vue'
const value = ref([])
const value2 = ref([])
</script>
