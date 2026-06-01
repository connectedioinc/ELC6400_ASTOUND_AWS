type ScopeParts<Scope, Parts extends string> = {
  [K in Parts]: {
    'data-scope': Scope
    'data-part': K
  }
}

export const makeParts = <TScope extends string, TPart extends string>(scope: TScope, parts: readonly TPart[]): ScopeParts<TScope, TPart> => {
  return Object.fromEntries(parts.map(part => [part, { 'data-part': part, 'data-scope': scope }])) as ScopeParts<TScope, TPart>
}
