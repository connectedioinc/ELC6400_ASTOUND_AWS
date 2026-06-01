export type PartialByKeys<T, K extends keyof T = keyof T> = Omit<{ [P in K]?: T[P] } & { [P in Exclude<keyof T, K>]: T[P] }, never>

export type RequiredByKeys<T, K extends keyof T = keyof T> = Omit<{ [P in K]-?: T[P] } & { [P in Exclude<keyof T, K>]: T[P] }, never>
