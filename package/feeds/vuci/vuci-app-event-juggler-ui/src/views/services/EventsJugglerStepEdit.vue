<template>
  <vuci-form
    ref="formRef"
    v-model="formData"
    config="event_juggler"
    editing
    bulk-request
  >
    <template #default="{ uciData: formUciData }">
      <Steps.Root
        v-slot="{ ctx }"
        :steps="editSteps"
        class="list-layout--ignore"
      >
        <Steps.Content value="events">
          <main-edit-section
            :uci-data="formUciData"
            :section="section"
            edit-type="events"
            @module-section-ref="moduleSectionRef => setEventModuleSection(moduleSectionRef)"
            @before-save="setEventBeforeSave"
          />
        </Steps.Content>
        <Steps.Content value="actions-conditions">
          <ListLayout bordered>
            <step-edit-section
              :uci-data="formUciData"
              :section="section"
              :form-ref="formRef!"
            />
            <condition-edit-section
              :uci-data="formUciData"
              :section="section"
              is-step-edit-section
              @open-condition="(section, stepType) => handleGoToCondition(ctx, section, stepType)"
            />
          </ListLayout>
        </Steps.Content>
        <Steps.Content value="conditions">
          <!-- 
            v-if is required here because this section functions as a second-level edit.
            By doing so this section is ignored by vuci-form save and validate methods.
          -->
          <main-edit-section
            v-if="ctx.current.value === 'conditions'"
            :uci-data="formUciData"
            :section="conditionSection"
            edit-type="conditions"
            should-update
            @module-section-ref="moduleSectionRef => setConditionModuleSection(moduleSectionRef)"
          />
        </Steps.Content>
        <div
          class="flex"
          :class="ctx.isFirst.value ? 'justify-end' : 'justify-between'"
        >
          <tlt-button
            v-if="!ctx.isFirst.value"
            button-id="back"
            color="secondary"
            @click="handleGoBack(ctx)"
          >
            {{ getBackButtonText(ctx.current.value) }}
          </tlt-button>
          <tlt-button
            button-id="next"
            color="primary"
            @click="handleGoNext(ctx)"
          >
            {{ getNextButtonText(ctx.current.value) }}
          </tlt-button>
        </div>
      </Steps.Root>
    </template>
    <template #form-buttons>
      <Empty />
    </template>
  </vuci-form>
</template>
<script setup lang="ts">
import MainEditSection from '../../components/services/edit-sections/EventsJugglerMainEditSection.vue'
import StepEditSection from '../../components/services/edit-sections/EventsJugglerStepEditSection.vue'
import ConditionEditSection from '../../components/services/edit-sections/EventsJugglerConditionEditSection.vue'
import VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'
import VuciNamedSection from '@ui-core/vuci-form/src/VuciNamedSection.vue'
import { useMessages, usePrompt } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { Steps } from '@ui-core/components/steps'
import { useEventsJugglerData } from '../../components/services/useEventsJugglerData'
import { type Ref, type ComponentPublicInstance, ref, provide, onMounted, inject, onUnmounted } from 'vue'
import type { UseStepsReturn } from '@ui-core/components/steps/use-steps'
import type { FormData, EventSection, ConditionSection, SectionName } from '@/types/eventsJugglerTypes'
import { $bus } from '@ui-core/plugins/event-bus'

interface StepEditFromProps {
  uciData: FormData
  section: EventSection
  editType: SectionName
}

const props = defineProps<StepEditFromProps>()
provide('parentSection', props.section)
const setSection = inject<(setterFn: (section: EventSection) => void) => void>('setSection')

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()
const prompt = usePrompt()
const { updateInitialForm, updateValue } = useEventsJugglerData()

const formRef: Ref<ComponentPublicInstance<typeof VuciForm> | null> = ref(null)
const conditionModuleSectionRef: Ref<ComponentPublicInstance<typeof VuciNamedSection> | null> = ref(null)
const eventModuleSectionRef: Ref<ComponentPublicInstance<typeof VuciNamedSection> | null> = ref(null)

const formData = ref(props.uciData)
const editSteps = ['events', 'actions-conditions', 'conditions']
const conditionSection: Ref<ConditionSection> = ref(props.section)
const initialConditionSection: Ref<ConditionSection> = ref(props.section)
const eventBeforeSaveValidation = ref(() => Promise.resolve(true))

onMounted(() => {
  $bus.on('event-juggler-update-value', payload => updateValue(formData.value, props.editType, payload))
  setSection?.((section: EventSection) => {
    section.enabled = undefined
  })
})

onUnmounted(() => {
  $bus.off('event-juggler-update-value', payload => updateValue(formData.value, props.editType, payload))
})

const backText: Record<string, string> = {
  'actions-conditions': $t('event configuration'),
  conditions: $t('action configuration')
}
function getBackButtonText(currentStep: string) {
  return $t('Back: %s').format(backText[currentStep])
}

const nextText: Record<string, string> = {
  events: $t('Next: %s').format($t('action configuration')),
  'actions-conditions': $t('Finish'),
  conditions: $t('Save & Apply')
}
function getNextButtonText(currentStep: string) {
  return nextText[currentStep]
}

function setEventModuleSection(sourceRef: ComponentPublicInstance<typeof VuciNamedSection>) {
  eventModuleSectionRef.value = sourceRef
}

function setConditionModuleSection(sourceRef: ComponentPublicInstance<typeof VuciNamedSection>) {
  conditionModuleSectionRef.value = sourceRef
}

function setEventBeforeSave(beforeSave: () => Promise<boolean>) {
  eventBeforeSaveValidation.value = beforeSave
}

const callback: Record<string, (ctx: UseStepsReturn) => void> = {
  'actions-conditions': (ctx: UseStepsReturn) => ctx.goToPrevious(),
  conditions: (ctx: UseStepsReturn) => handleShowPrompt(ctx)
}
function handleGoBack(ctx: UseStepsReturn) {
  return callback[ctx.current.value](ctx)
}

// HandleGoToNext context
const stepValidation: Record<string, () => Promise<boolean>> = {
  events: () => eventModuleSectionRef.value?.validate() ?? Promise.resolve(false),
  conditions: () => conditionModuleSectionRef.value?.validate() ?? Promise.resolve(false),
  default: () => Promise.resolve(true)
}

const beforeSaveValidation: Record<string, () => Promise<boolean>> = {
  events: () => eventBeforeSaveValidation.value(),
  default: () => Promise.resolve(true)
}

const stepCallback: Record<string, (ctx: UseStepsReturn) => void> = {
  events: (ctx: UseStepsReturn) =>
    handleSaveSection(eventModuleSectionRef.value?.saveData, $t('event'), () => {
      updateInitialForm(props.uciData, true)
      ctx.goToNext()
    }),
  'actions-conditions': () => {
    formRef.value?.save()
  },
  conditions: (ctx: UseStepsReturn) => handleSaveSection(() => formRef.value?.handleFileUpload().then(() => conditionModuleSectionRef.value?.saveData()), $t('condition'), ctx.goToPrevious)
}

function validateStep(currentStep: string) {
  return stepValidation[currentStep]?.() || stepValidation.default()
}

function validateBeforeSave(currentStep: string) {
  return beforeSaveValidation[currentStep]?.() || beforeSaveValidation.default()
}
// HandleGoToNext context
function handleGoNext(ctx: UseStepsReturn) {
  const currentStep = ctx.current.value
  return validateStep(currentStep).then((res: boolean) => {
    if (!res) {
      message.error($t('Some fields are invalid'))
      return
    }
    return validateBeforeSave(currentStep)
      .then(() => {
        return stepCallback[currentStep](ctx)
      })
      .catch(error => {
        message.error(error)
      })
  })
}

function handleSaveSection(save: () => Promise<boolean>, configName: string, callback: () => void) {
  const spinMessage = $t('Waiting for the %s configuration to be applied').format(configName)
  store.spin(spinMessage)
  save()
    .then((res: boolean) => {
      if (res) return callback()
    })
    .catch(e => message.error(e))
    .finally(() => store.spin(false))
}

function handleGoToCondition(ctx: UseStepsReturn, section: ConditionSection, stepType: string) {
  if (stepType === 'add') resetConditionInForm(section)
  conditionSection.value = section
  initialConditionSection.value = { ...section }
  return ctx.goToNext()
}

function handleShowPrompt(ctx: UseStepsReturn) {
  prompt.show({
    title: $t('Go back?'),
    content: $t('Unsaved changes will be discarded'),
    okText: $t('Discard'),
    cancelText: $t('Cancel'),
    onOk: () => {
      resetConditionInForm(initialConditionSection.value)
      return ctx.goToPrevious()
    }
  })
}

function resetConditionInForm(resetData: ConditionSection) {
  const conditionIndex = formData.value?.conditions?.findIndex((condition: ConditionSection) => condition.id === conditionSection.value?.id)
  if (conditionIndex === -1) return
  formData.value.conditions[conditionIndex] = resetData
}
</script>
