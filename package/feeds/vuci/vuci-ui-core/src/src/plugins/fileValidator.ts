import { i18n } from '@ui-core/plugins/i18n'

const validationErrorCodes: Record<string, number> = {
  invalidType: 201,
  emptyPath: 202,
  exceedsMaxLength: 203,
  controlCharacters: 204,
  pathTraversal: 205,
  endsWithPeriod: 206,
  escapeSequences: 207,
  endsWithSlash: 208,
  consecutiveSlashes: 209,
  filenameTooLong: 210,
  locationIsDirectory: 211,
  locationExistsNoOverwrite: 212,
  filetypeMismatch: 213,
  invalidLocation: 214,
  parentNotDir: 215
}

/**
 * Maximum path length constant
 */
const MAX_LENGTH_DEFAULT = 4095

/**
 * Validates a POSIX file path with the same rules as the backend
 * @param val - Path to validate
 * @param filetype - Expected file type ('dir', 'file', etc.)
 * @returns Tuple containing [isValid, errorCode]
 */
export function validatePosixPath(val: string, filetype?: string): [boolean, number?] {
  if (typeof val !== 'string') {
    return [false, validationErrorCodes.invalidType]
  }

  if (val === '') {
    return [false, validationErrorCodes.emptyPath]
  }

  if (val.length > MAX_LENGTH_DEFAULT) {
    return [false, validationErrorCodes.exceedsMaxLength]
  }

  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F]/.test(val)) {
    return [false, validationErrorCodes.controlCharacters]
  }

  if (val.startsWith('../') || val.includes('/../')) {
    return [false, validationErrorCodes.pathTraversal]
  }

  if (val.endsWith('/.') || val.endsWith('/..') || val === '.' || val === '..') {
    return [false, validationErrorCodes.endsWithPeriod]
  }

  if (val.includes('\\')) {
    return [false, validationErrorCodes.escapeSequences]
  }

  if (val.endsWith('/') && filetype !== 'dir') {
    return [false, validationErrorCodes.endsWithSlash]
  }

  if (val.includes('//')) {
    return [false, validationErrorCodes.consecutiveSlashes]
  }

  const components = val.split('/').filter(Boolean)
  for (const component of components) {
    if (component.length > 254) {
      return [false, validationErrorCodes.filenameTooLong]
    }
  }

  return [true, undefined]
}

/**
 * Get error message for a validation error code
 * @param errorCode - The error code
 * @return The error message
 */
export function getValidationErrorMessage(errorCode: number): string {
  const errorMessages: Record<number, string> = {
    [validationErrorCodes.invalidType]: i18n.t('Invalid type, expected a string.'),
    [validationErrorCodes.emptyPath]: i18n.t('Path must be a non-empty string.'),
    [validationErrorCodes.exceedsMaxLength]: i18n.t('Path exceeds maximum length (4095 characters).'),
    [validationErrorCodes.controlCharacters]: i18n.t('Path contains null bytes or control characters.'),
    [validationErrorCodes.pathTraversal]: i18n.t('Path contains path traversal sequences.'),
    [validationErrorCodes.endsWithPeriod]: i18n.t('Path cannot end with a single or double period.'),
    [validationErrorCodes.escapeSequences]: i18n.t('Path contains escape sequences.'),
    [validationErrorCodes.endsWithSlash]: i18n.t("Path cannot end with a forward slash unless it's a directory."),
    [validationErrorCodes.consecutiveSlashes]: i18n.t('Path contains consecutive slashes.'),
    [validationErrorCodes.filenameTooLong]: i18n.t('Path contains a filename component that exceeds 254 characters.'),
    [validationErrorCodes.locationIsDirectory]: i18n.t('Path exists but is a directory.'),
    [validationErrorCodes.locationExistsNoOverwrite]: i18n.t('Path already exists and overwriting is not allowed.'),
    [validationErrorCodes.filetypeMismatch]: i18n.t('Path must be a file of the specified type.'),
    [validationErrorCodes.invalidLocation]: i18n.t('Path does not exist.'),
    [validationErrorCodes.parentNotDir]: i18n.t('Parent path is not a directory.')
  }

  return errorMessages[errorCode] || i18n.t('Unknown validation error.')
}

export { validationErrorCodes }
