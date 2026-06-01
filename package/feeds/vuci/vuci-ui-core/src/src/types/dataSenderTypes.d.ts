export type DataSenderOutput = {
  id: string
  name: string
  plugin?: string
  [key: string]: any
}

export type DataSenderCollection = {
  id: string
  name: string
  output?: string
  [key: string]: any
}
