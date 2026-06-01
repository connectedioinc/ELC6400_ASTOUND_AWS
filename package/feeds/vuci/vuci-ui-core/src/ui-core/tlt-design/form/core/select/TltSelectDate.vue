<template>
  <div class="tlt-input-wrapper">
    <div
      :id="inputId"
      :test-id="`selectwrapper-${elementId || $attrs.id}`"
      :data-open="`${open}`"
      class="w-full"
    >
      <div
        :id="'select.' + inputId"
        ref="input"
        role="button"
        :test-id="`selectstate-${elementId || $attrs.id}`"
        class="tlt-input-field py-0! text-left md:w-full whitespace-nowrap text-ellipsis overflow-x-hidden min-w-0 relative flex items-center"
        :class="{ 'text-theme-text-secondary-subtle': !modelValue.length, 'with-fade': fadeOverflow }"
        tabindex="0"
        @click="toggleOpen"
        @keydown.enter="toggleOpen"
        @keydown.esc="onClose"
      >
        <div
          v-if="icon"
          class="tlt-input-after"
        >
          <tlt-icon
            :icon="icon"
            class="transition-transform duration-300 size-5"
          />
        </div>
        <div
          :test-id="`input-${elementId || $attrs.id}`"
          class="overflow-x-hidden text-ellipsis"
        >
          <slot name="selectedOption">
            {{ displayValue }}
          </slot>
        </div>
        <div class="tlt-input-before ml-auto">
          <tlt-icon
            icon="dropdown-arrow"
            :class="{ 'rotate-180': open }"
            class="transition-transform duration-300 size-5"
          />
        </div>
      </div>
    </div>
    <tlt-content-box
      :open="open"
      :target="`#select.${inputId}`"
      size="big"
      placement="bottom-end"
      @update:open="onClose"
    >
      <div>
        <div class="grid grid-cols-2">
          <span class="flex p-4 border-r border-b">
            <tlt-button
              button-id="previous"
              type="icon"
              color="tertiary"
              icon="dropdown-arrow"
              class="rotate-90 size-5"
              :class="{ invisible: parseInt(setValue.year) <= minYear }"
              @click="changeYear(-1)"
            />
            <span class="flex w-full h-full justify-center items-center">{{ setValue.year }}</span>
            <tlt-button
              button-id="next"
              type="icon"
              color="tertiary"
              icon="dropdown-arrow"
              class="-rotate-90"
              :class="{ invisible: parseInt(setValue.year) >= getTodays() }"
              @click="changeYear(1)"
            />
          </span>
          <span
            class="flex p-4 border-b cursor-pointer"
            @click="showMonthView = !showMonthView"
          >
            <tlt-button
              v-if="!showMonthView"
              button-id="monthview"
              type="icon"
              color="tertiary"
              icon="dropdown-arrow"
              class="rotate-90"
            />
            <span class="flex w-full h-full justify-center items-center">
              {{ showMonthView ? $t('Day') : getSetMonthName() }}
            </span>
          </span>
        </div>
        <template v-if="showMonthView">
          <div class="p-4">
            <div class="grid grid-cols-3">
              <span
                v-for="(name, index) in monthNames"
                :key="index"
                class="px-2 py-4"
              >
                <span
                  class="flex justify-center items-center cursor-pointer w-full py-1 hover:text-theme-text-primary hover:rounded-full hover:bg-theme-bg-hover"
                  :class="{
                    'rounded-full border border-theme-border-primary': index === getTodays('month'),
                    'rounded-full bg-theme-bg-primary-1 text-theme-text-on-primary': index === setValue.month
                  }"
                  @click="selectMonth(index)"
                >
                  {{ name }}
                </span>
              </span>
            </div>
          </div>
        </template>
        <template v-else>
          <div
            class="p-2"
            @mouseleave="handleLeave"
            @mouseup="handleEnd"
          >
            <div
              v-for="(week, index) in calendarView"
              :key="index"
              class="grid grid-cols-7 p-2 content-center items-center justify-center"
            >
              <template v-if="index === 0">
                <span
                  v-for="(name, index2) in week"
                  :key="index2"
                  class="grid content-center items-center justify-center"
                >
                  {{ name }}
                </span>
              </template>
              <template v-else>
                <div
                  v-for="(day, index2) in week"
                  :key="index2"
                  class="grid content-center items-center justify-center"
                  :class="{
                    'bg-theme-bg-active': intervalHighlight(day),
                    'rounded-l-full': selectedStart(day),
                    'bg-linear-to-l from-theme-bg-active': selectedStart(day) && endValue.day,
                    'bg-linear-to-r from-theme-bg-active rounded-r-full': selectedEnd(day)
                  }"
                >
                  <button
                    class="flex justify-center items-center cursor-pointer size-7 hover:text-theme-text-primary hover:rounded-full hover:bg-theme-bg-hover"
                    :class="{
                      'text-theme-text-secondary-subtle': day.previous || day.next
                    }"
                    @mousedown="handleStart($event, day)"
                    @mouseenter="handle(day)"
                    @mouseup="handleEnd"
                    @touchstart="handleStart($event, day)"
                    @touchend="handleEnd"
                  >
                    <span
                      :class="{
                        'flex justify-center items-center size-7 rounded-full border border-theme-border-primary z-10':
                          day.number === getTodays('day', false) && !day.previous && !day.next && day.year === getTodays(),
                        'flex justify-center items-center size-7 rounded-full bg-theme-bg-primary-1 text-theme-text-on-primary z-10': selectedHighlight(day)
                      }"
                    >
                      {{ day.number }}
                    </span>
                  </button>
                </div>
              </template>
            </div>
          </div>
          <div
            v-if="selected.value && selected.value.length > 1"
            class="border-t flex gap-2 p-4"
          >
            <tlt-button
              class="px-4 py-1.5"
              button-id="clear"
              type="text"
              @click="clear"
            >
              {{ $t('Clear') }}
            </tlt-button>
            <tlt-button
              class="ml-auto"
              button-id="apply"
              button-type="submit"
              :disabled="false"
              @click="selectInput"
            >
              {{ $t('Apply Filter') }}
            </tlt-button>
          </div>
        </template>
      </div>
    </tlt-content-box>
  </div>
</template>

<script>
import tltDependMixin from '../tltDependMixin.vue'
import { useCommonInjects as useInputInjects } from '../_shared/useCommonInjects'

export default {
  name: 'TltSelectDate',
  mixins: [tltDependMixin],
  props: {
    icon: {
      type: String,
      default: 'calendar'
    },
    modelValue: {
      type: [Number, String, Array],
      default: null
    },
    placeholder: {
      type: String,
      default: ''
    },
    fadeOverflow: {
      type: Boolean,
      default: false
    },
    minYear: {
      type: Number,
      default: 1970
    }
  },
  emits: ['open', 'close', 'update:modelValue'],
  setup() {
    return useInputInjects()
  },
  data() {
    return {
      selected: {},
      open: false,
      daysOfWeek: [this.$t('Mon'), this.$t('Tue'), this.$t('Wed'), this.$t('Thu'), this.$t('Fri'), this.$t('Sat'), this.$t('Sun')],
      monthNames: [
        this.$t('Jan'),
        this.$t('Feb'),
        this.$t('Mar'),
        this.$t('Apr'),
        this.$t('May'),
        this.$t('June'),
        this.$t('July'),
        this.$t('Aug'),
        this.$t('Sept'),
        this.$t('Oct'),
        this.$t('Nov'),
        this.$t('Dec')
      ],
      showMonthView: false,
      setValue: { year: null, month: null, day: null },
      startValue: {},
      endValue: {},
      today: new Date(),
      drag: false,
      displayValue: this.$t('Select a date')
    }
  },
  computed: {
    inputId() {
      return this.itemId || this.$.uid
    },
    calendarView() {
      const normalWeekDays = [6, 0, 1, 2, 3, 4, 5] // Sunday - 0 pos, Saturday - 6 pos
      const year = this.setValue.year
      const month = this.setValue.month
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const firstDay = normalWeekDays[new Date(year, month, 1).getDay()]
      // month [0, 11]
      const daysArray = []
      let week = []
      for (let i = 0; i < firstDay; i++) {
        week.push({ number: new Date(year, month, -firstDay + i + 1).getDate(), previous: true, month: month === 0 ? 11 : month - 1, year: month === 0 ? year - 1 : year })
      }
      for (let day = 1; day <= daysInMonth; day++) {
        week.push({ number: day, month: month, year: year })
        if (week.length === 7) {
          daysArray.push(week)
          week = []
        }
      }
      let nextMonthDay = 1
      while (week.length > 0 && week.length < 7) {
        week.push({ number: nextMonthDay++, next: true, month: month === 11 ? 0 : month + 1, year: month === 11 ? year + 1 : year })
      }
      if (week.length > 0) {
        daysArray.push(week)
      }
      daysArray.unshift(this.daysOfWeek)

      return daysArray
    },
    defaultPlaceholder() {
      return this.placeholder || this.$t('Select a date')
    }
  },
  watch: {
    open(open) {
      if (open) this.$emit('open')
      else this.$emit('close')
    },
    modelValue(newVal) {
      if (newVal.length === 0) this.clear(true)
    }
  },
  mounted() {
    this.setValue = {
      year: this.getTodays(),
      month: this.getTodays('month'),
      day: this.getTodays('day')
    }
  },
  methods: {
    handleStart(e, day) {
      this.drag = true
      e.preventDefault()
      this.selectDay(day)
    },
    handleEnd() {
      this.drag = false
    },
    handleLeave() {
      this.drag = false
    },
    handle(day) {
      if (Object.keys(this.startValue).length === 0) return
      if (this.drag) {
        if (
          (day.year === this.startValue.year && day.month === this.startValue.month && day.number < this.startValue.day) ||
          (day.month < this.startValue.month && day.year <= this.startValue.year) ||
          day.year < this.startValue.year
        ) {
          return
        }
        this.setValue = { day: day.number, month: day.month, year: day.year }
        this.endValue = { ...this.setValue }
        this.selected = this.dateToUnix(this.startValue, this.endValue)
      }
    },
    getTodays(param, ignoreMonthCheck = true) {
      switch (param) {
        case 'day':
          return this.today.getMonth() === this.setValue.month || ignoreMonthCheck ? parseInt(this.$localDate(this.today.getTime() / 1000, { format: 'D', timezoneConversion: false })) : null
        case 'month':
          return parseInt(this.$localDate(this.today.getTime() / 1000, { format: 'M', timezoneConversion: false })) - 1
        default:
          return parseInt(this.$localDate(this.today.getTime() / 1000, { format: 'YYYY', timezoneConversion: false }))
      }
    },
    getSetMonthName() {
      return this.$localDate(new Date(this.setValue.year, this.setValue.month, 1).getTime() / 1000, { format: 'MMMM', timezoneConversion: false })
    },
    changeYear(operation) {
      this.setValue.year += operation
    },
    selectMonth(month) {
      this.setValue.month = month
      this.showMonthView = false
    },
    selectDay(day) {
      this.setValue = { day: day.number, month: day.month, year: day.year }
      const isStartValueEmpty = Object.keys(this.startValue).length === 0
      const isBeforeStartValue = this.startValue?.year === this.setValue.year && this.startValue?.month === this.setValue.month && this.setValue.day < this.startValue?.day
      const isMonthBeforeStartValue = this.setValue.year === this.startValue?.year && this.setValue.month < this.startValue?.month
      const isYearBeforeStartValue = this.setValue.year < this.startValue?.year

      if (isStartValueEmpty || isBeforeStartValue || isMonthBeforeStartValue || isYearBeforeStartValue) {
        this.startValue = { ...this.setValue }
        this.endValue = {}
        this.selected = this.dateToUnix(this.setValue)
      } else if (Object.keys(this.endValue).length === 0) {
        this.endValue = { ...this.setValue }
        this.selected = this.dateToUnix(this.startValue, this.endValue)
      } else {
        this.startValue = { ...this.setValue }
        this.endValue = {}
        this.selected = this.dateToUnix(this.setValue)
      }
    },
    selectedStart(day) {
      return day.number === this.startValue.day && day.month === this.startValue.month && day.year === this.startValue.year
    },
    selectedEnd(day) {
      return day.number === this.endValue.day && day.month === this.endValue.month && day.year === this.endValue.year
    },
    selectedHighlight(day) {
      return this.selectedStart(day) || this.selectedEnd(day)
    },
    intervalHighlight(day) {
      const dayBetweenStartEnd =
        day.number > this.startValue.day &&
        day.number < this.endValue.day &&
        ((day.month === this.startValue.month && day.year === this.startValue.year) || (day.month === this.endValue.month && day.year === this.endValue.year))
      const monthBetweenStartEnd = day.month > this.startValue.month && day.month < this.endValue.month && day.year >= this.startValue.year && day.year <= this.endValue.year
      const monthBetweenStartEndYears =
        (day.year >= this.startValue.year && day.month > this.startValue.month && this.endValue.year && day.year < this.endValue.year) ||
        (day.year <= this.endValue.year && day.month < this.endValue.month && day.year > this.startValue.year)
      const startMonthDiffYear =
        (day.year === this.startValue.year && day.month === this.startValue.month && day.number > this.startValue.day && day.year < this.endValue.year) ||
        (day.year === this.endValue.year && day.month === this.endValue.month && day.number < this.endValue.day && day.year > this.startValue.year)
      const dayLaterThanStart = day.number > this.startValue.day && day.month === this.startValue.month && day.year === this.startValue.year && this.endValue.month && day.month !== this.endValue.month
      const dayEarlierThanEnd = day.number < this.endValue.day && day.month === this.endValue.month && day.year === this.endValue.year && day.month !== this.startValue.month
      return dayBetweenStartEnd || monthBetweenStartEnd || dayLaterThanStart || dayEarlierThanEnd || monthBetweenStartEndYears || startMonthDiffYear
    },
    parseValue() {
      if (!this.selected.value || this.selected.value.length === 0) return this.defaultPlaceholder
      const start = this.startValue
      const end = this.endValue
      if (!end || Object.keys(end).length === 0) {
        return `${this.monthNames[start.month]} ${start.day}, ${start.year}`
      }
      if (start.year !== end.year) {
        return `${this.monthNames[start.month]} ${start.day}, ${start.year} - ${this.monthNames[end.month]} ${end.day}, ${end.year}`
      }
      return `${this.monthNames[start.month]} ${start.day} - ${this.monthNames[end.month]} ${end.day}, ${end.year}`
    },
    toggleOpen() {
      if (this.open) this.onClose()
      else {
        this.open = true
        if (this.modelValue?.length > 1) this.selected.value = [this.modelValue[0], this.modelValue[1]]
      }
    },
    selectInput() {
      this.displayValue = this.parseValue()
      this.open = false
      this.$emit('update:modelValue', this.selected.value)
    },
    clear(ignore) {
      this.startValue = {}
      this.endValue = {}
      this.setValue = {
        year: this.getTodays(),
        month: this.getTodays('month'),
        day: this.getTodays('day')
      }
      this.selected.value = []
      this.displayValue = this.parseValue()
      if (ignore !== true) {
        this.$emit('update:modelValue', this.selected.value)
      }
    },
    onClose() {
      const startVal = this.modelValue[0] ? this.unixToDate(this.modelValue[0]) : {}
      const endVal = this.modelValue[1] ? this.unixToDate(this.modelValue[1]) : {}
      this.startValue = startVal
      this.endValue = endVal
      this.setValue = {
        year: this.getTodays(),
        month: this.getTodays('month'),
        day: this.getTodays('day')
      }
      this.selected.value = []
      this.open = false
    },
    unixToDate(val) {
      const userTimeZone = this.$store.timeZone
      const date = this.$date.unix(val).tz(userTimeZone)
      return { year: date.year(), month: date.month(), day: date.date() }
    },
    dateToUnix(start, end) {
      const userTimeZone = this.$store.timeZone
      if (!end) {
        return {
          value: [this.$date.tz(`${start.year}-${start.month + 1}-${start.day}`, userTimeZone).unix()]
        }
      }
      return {
        value: [this.$date.tz(`${start.year}-${start.month + 1}-${start.day}`, userTimeZone).unix(), this.$date.tz(`${end.year}-${end.month + 1}-${end.day} 23:59:59`, userTimeZone).unix()]
      }
    }
  }
}
</script>

<style scoped>
.with-fade::before {
  content: ' ';
  position: absolute;
  top: 0;
  bottom: 0;
  right: calc(100% + 0.5rem - 1px);
  --fade-clr: 255, 255, 255;
  width: 6rem;
  pointer-events: none;
  background-image: linear-gradient(to left, rgba(var(--fade-clr)), rgb(255, 255, 255, 0));
}
</style>
