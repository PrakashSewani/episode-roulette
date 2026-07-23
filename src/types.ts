export interface SelectorConfig {
  name: string
  selectors: string[]
}

export type PageChangeEvent =
  | { type: 'route-changed'; url: string }
  | { type: 'title-dom-changed'; url: string; generation: number }
  | { type: 'title-root-removed'; url: string; generation: number }

export type PageChangeCallback = (event: PageChangeEvent) => void

export interface TitleContext {
  titleId: string
  source: 'jbv' | 'title-path'
  url: string
}

export interface OperationContext {
  title: TitleContext
  generation: number
  controller: AbortController
  detectionDeadline: number
}

export type ButtonState = 'loading' | 'ready' | 'error'

export interface ButtonController {
  setState(state: ButtonState, errorMessage?: string): void
  onClick(handler: () => void): void
  remove(): void
}
