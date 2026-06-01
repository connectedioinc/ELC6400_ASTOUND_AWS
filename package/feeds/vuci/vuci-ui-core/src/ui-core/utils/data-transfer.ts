import { isFunction, isNonNullable } from './inspect'

const getItemEntry = (item: any): FileSystemEntry | null => {
  return isFunction(item.getAsEntry) ? item.getAsEntry() : isFunction(item.webkitGetAsEntry) ? item.webkitGetAsEntry() : null
}

const isFileEntry = (entry: FileSystemEntry): entry is FileSystemFileEntry => entry.isFile

export function getFileEntries(items: DataTransferItemList): Promise<File[]> {
  const promises = Array.from(items)
    .filter(i => i.kind === 'file')
    .map(item => {
      const entry = getItemEntry(item)
      if (!entry) return null

      if (isFileEntry(entry) && isFunction(item.getAsFile)) {
        return item.getAsFile()
      }

      if (isFileEntry(entry)) {
        return new Promise<File>(resolve => entry.file(file => resolve(file)))
      }
      return null
    })
    .filter(isNonNullable)
  return Promise.all(promises)
}
