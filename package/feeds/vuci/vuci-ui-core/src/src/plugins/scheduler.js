import { i18n } from '@ui-core/plugins/i18n'

export const scheduler = {}
/**
 * @description Function check if provided intervals range overlaps.
 * @param {number} interval1Start - First interval range start
 * @param {number} interval1End - First interval range end
 * @param {number} interval2Start - Second interval range start
 * @param {number} interval2End - Second interval range end
 * @returns {boolean} - Does intervals overlap
 */
scheduler.checkIntervals = function (interval1Start, interval1End, interval2Start, interval2End) {
  const firstCheck = interval1Start < interval2Start && interval1End <= interval2Start
  const secondCheck = interval2Start < interval1Start && interval2End <= interval1Start
  return !(firstCheck || secondCheck)
}
/**
 * @description Function generate month days option list from value 1 to 31.
 * @return {Array[]} - Return list of days
 */
scheduler.generateMonthDays = function () {
  const days = []
  for (let i = 1; i < 32; i++) {
    days.push([i.toString(), i.toString()])
  }
  return days
}
/**
 * @description Function change provided date and time to integer for easier range comparison.
 * @param {string} day - Interval day
 * @param {string} time - Time in hh:ss format.
 * @returns {number} -
 */
scheduler.convertTimeToNumber = function (day, time) {
  const [h, m] = time.split(':')
  return parseInt(day) * 10000 + parseInt(h) * 100 + parseInt(m)
}
/**
 * @description Function construct string to identify then period starts or ends.
 * @param {('end'|'start')} bound
 * @return {string} - Function return formatted month day value
 */
scheduler.convertMonthDaysPeriodToText = function (day, time, force) {
  if (!day) {
    return i18n.t('N/A')
  }
  if (force === '1' && parseInt(day) > 28) {
    return `${i18n.t('Every last day of month')}, ${time}`
  }
  let suffix = 'th'
  if (parseInt(day) < 10 || parseInt(day) > 20) {
    if (day.substring(day.length - 1, day.length) === '1') {
      suffix = 'st'
    } else if (day.substring(day.length - 1, day.length) === '2') {
      suffix = 'nd'
    } else if (day.substring(day.length - 1, day.length) === '3') {
      suffix = 'rd'
    }
  }
  return `${i18n.t('Every')} ${day}${suffix} ${i18n.t('day of month')}, ${time}`
}
/**
 * @description Function construct string to identify then period starts or ends.
 * @param {('end'|'start')} bound
 * @return {string} - Function return formatted week day value
 */
scheduler.convertWeekdayPeriodToText = function (day, time) {
  const weekDays = {
    0: i18n.t('Sunday'),
    1: i18n.t('Monday'),
    2: i18n.t('Tuesday'),
    3: i18n.t('Wednesday'),
    4: i18n.t('Thursday'),
    5: i18n.t('Friday'),
    6: i18n.t('Saturday')
  }
  const weekday = weekDays[day]
  return `${i18n.t('Every')} ${weekday}, ${time}`
}
/**
 * @description Function checks if selected instance interval doesn't overlap with another instance.
 * @returns {boolean} - is rule invalid.
 * @param main - section that is edited
 * @param sections - other related sections
 */
scheduler.validateInterval = function (main, sections) {
  const editedSectionStart = scheduler.convertTimeToNumber(main.start_day, main.start_time)
  const editedSectionEnd = scheduler.convertTimeToNumber(main.end_day, main.end_time)
  if (editedSectionStart === editedSectionEnd) return { invalid: true, error: 'startsameasend' }
  const relatedSections = sections.map(section => [scheduler.convertTimeToNumber(section.start_day, section.start_time), scheduler.convertTimeToNumber(section.end_day, section.end_time)])
  const isInvalid = relatedSections.some(([start, end]) => scheduler.checkIntervals(editedSectionStart, editedSectionEnd, start, end))
  return { invalid: isInvalid, error: 'overlap' }
}
export default {
  install(app) {
    app.config.globalProperties.$scheduler = scheduler
  }
}
