export interface PasswordPolicy {
  '.type': string
  id: string
  require_digits: string
  require_password: string
  require_lower_upper: string
  current_days_left?: string
  require_special: string
  password_lifetime: string
}
