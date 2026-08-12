import type { ProviderRuntime } from '../types'
import netflixRuntime from './netflix'

const providers: ProviderRuntime[] = [netflixRuntime]

export function getProvider(url: string): ProviderRuntime | null {
  return providers.find((provider) => provider.matches(url)) ?? null
}

export function getProviders(): readonly ProviderRuntime[] {
  return providers
}
