export async function getFileContents(file: File) {
  if ('text' in file) return file.text()
  const reader = new FileReader()
  return new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}
