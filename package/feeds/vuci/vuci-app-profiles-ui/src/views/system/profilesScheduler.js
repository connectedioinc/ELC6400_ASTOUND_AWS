const profilesScheduler = {}

profilesScheduler.intervalRangesOverlap = function (interval1Start, interval1End, interval2Start, interval2End) {
  return (
    (interval1Start >= interval2Start && interval1Start <= interval2End) ||
    (interval1End >= interval2Start && interval1End <= interval2End) ||
    (interval1Start === interval2Start && interval1End === interval2End) ||
    (interval1Start > interval1End && interval1End >= interval2End) ||
    (interval1Start <= interval2Start && interval1End >= interval2Start) ||
    (interval2Start > interval2End && interval1End <= interval2End)
  )
}

profilesScheduler.getTimeNumber = function (day, time) {
  const [h, m] = time.split(':')
  const timeSum = parseInt(day) * 10000 + parseInt(h) * 100 + parseInt(m)
  return timeSum
}

profilesScheduler.validateOverlap = function (section, scheduler) {
  const id = section.id
  const period = section.period
  const start = profilesScheduler.getTimeNumber(section.start_day, section.start_time)
  const end = profilesScheduler.getTimeNumber(section.end_day, section.end_time)
  const schedulerSections = scheduler.filter(section => section.enabled === '1' && section.period === period && section.id !== id)
  return schedulerSections.some(section => {
    const intervalStart = profilesScheduler.getTimeNumber(section.start_day, section.start_time)
    const intervalEnd = profilesScheduler.getTimeNumber(section.end_day, section.end_time)
    return profilesScheduler.intervalRangesOverlap(start, end, intervalStart, intervalEnd)
  })
}

export default profilesScheduler
