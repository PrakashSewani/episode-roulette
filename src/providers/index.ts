import type { ProviderRuntime } from '../types'
import netflixRuntime from './netflix'
import primeRuntime from './prime-video'

const providers: ProviderRuntime[] = [netflixRuntime, primeRuntime]

export function getProvider(url: string): ProviderRuntime | null {
  return providers.find((provider) => provider.matches(url)) ?? null
}

export function getProviders(): readonly ProviderRuntime[] {
  return providers
}
