export type SavedObject<T> = T & { id: string }

export type ObjectCreate<T> = Omit<T, 'id'> & { id?: string }

export type ObjectUpdate<T> = Partial<T> & { id?: undefined }
