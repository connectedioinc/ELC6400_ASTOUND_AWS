export interface Io {
  id: string
  type: string
  io_name: string
  block_pins: number[]
  name_with_pins?: string
  name_with_params?: string
  direction: string
  bi_dir: string
  io_param: string
  hr_state: string
  hr_state_low?: string
  hr_state_high?: string
  hr_state_open?: string
  hr_state_closed?: string
  hr_state_shorted?: string
  invert_input: string
  block_index: number
  block_type: string
  is_counter: string
  counter_support?: '1' | '0'
  value?: string | number
  state?: string
  custom_name?: string
  custom_value?: string | number
  custom_unit?: string
  custom_add?: string
  custom_mul?: string
  custom_div?: string
  custom_off?: string
  percent?: string
  current?: string
}

export interface FormulaModel {
  custom_add: string
  custom_mul: string
  custom_div: string
  custom_off: string
}
