/**
 * a function that always attaches attribute no matter the value truthiness. use it for aria attributes.
 * @example
 * ```vue
 * <input :aria-attr-1="ariaAttribute(true)" :aria-attr-2="ariaAttribute(false)" />
 * // results in
 * <input aria-attr-1="true" aria-attr-2="false" />
 * ```
 */
export const ariaAttribute = (value: any): boolean => !!value

/**
 * a function that attaches data attribute if provided value is truthy
 * @example
 * ```vue
 * <input :data-attr-1="dataAttribute(true)" :data-attr-2="dataAttribute(false)" />
 * // results in (no data-attr-2)
 * <input data-attr-1="" />
 * ```
 */
export const dataAttribute = (value: any): '' | undefined => (value ? '' : undefined)

/**
 * a function that attaches attribute with passed value if provided value is truthy
 * @example
 * ```vue
 * <input :data-attr-1="optionalAttribute('boom')" :data-attr-2="optionalAttribute('')" />
 * // results in (falsy values don't get attached, data-attr-2 is omitted)
 * <input data-attr-1="boom" />
 * ```
 */
export const optionalAttribute = (value: any) => (value ? value : undefined)
