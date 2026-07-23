# randomizer.ts — Random Selection

## Purpose

Select one episode uniformly at random from an array of episodes.

---

## Responsibilities

1. Accept an array of episodes
2. Return one episode with equal probability
3. Pure function — no side effects

---

## API

```typescript
import { Episode } from '../types'

/**
 * Pick one episode at random with uniform probability.
 * @param episodes - Array of available episodes
 * @returns One randomly selected episode
 * @throws Error if episodes array is empty
 */
export function pickRandom(episodes: Episode[]): Episode
```

---

## Implementation

```typescript
export function pickRandom(episodes: Episode[]): Episode {
  if (episodes.length === 0) {
    throw new Error('Cannot pick random episode from empty array')
  }
  const index = Math.floor(Math.random() * episodes.length)
  return episodes[index]
}
```

---

## Randomness

- Uses `Math.random()` which is sufficient for this use case
- Not cryptographically secure (not needed)
- Uniform distribution across all episodes
- Each invocation is independent of all previous invocations
- The module never reads or writes selection history
- Repeated selection of the same episode is valid pure-random behavior

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Empty array | Throw error |
| Single episode | Return that episode |
| 1000+ episodes | Works fine (linear scan not needed, O(1)) |

---

## Testing

- Unit test: Returns element from array
- Unit test: Throws on empty array
- Unit test: Distribution is roughly uniform (statistical test over many calls)
