import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { seekToBeginning } from '../../src/engine/restart'

async function flushPromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

async function drain(promise: Promise<void>): Promise<void> {
  await flushPromises()
  await vi.advanceTimersByTimeAsync(15_000)
  await flushPromises()
  await promise
}

function createVideo(currentTime = 0): HTMLVideoElement {
  const video = document.createElement('video')
  Object.defineProperty(video, 'currentTime', {
    writable: true,
    configurable: true,
    value: currentTime,
  })
  return video
}

function createTimeline(): HTMLElement {
  const timeline = document.createElement('div')
  timeline.dataset.uia = 'timeline'
  timeline.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 400,
    left: 100,
    bottom: 420,
    right: 900,
    width: 800,
    height: 20,
    toJSON: () => ({}),
  })
  return timeline
}

describe('seekToBeginning', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('after settle, clicks the timeline start when video has resume progress', async () => {
    const video = createVideo(244)
    const timeline = createTimeline()
    const click = vi.spyOn(timeline, 'dispatchEvent')
    document.body.append(video, timeline)

    await drain(seekToBeginning(new AbortController().signal))

    expect(click).toHaveBeenCalled()
    const types = click.mock.calls.map(([event]) => (event as Event).type)
    expect(types).toContain('pointerdown')
    expect(types).toContain('click')
    // Must never mutate media currentTime (M7375).
    expect(video.currentTime).toBe(244)
  })

  it('never assigns video.currentTime', async () => {
    const video = createVideo(90)
    const timeline = createTimeline()
    document.body.append(video, timeline)
    const setter = vi.fn()
    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      get: () => 90,
      set: setter,
    })

    await drain(seekToBeginning(new AbortController().signal))

    expect(setter).not.toHaveBeenCalled()
  })

  it('does not click when already near the beginning after settle', async () => {
    const video = createVideo(2)
    const timeline = createTimeline()
    const click = vi.spyOn(timeline, 'dispatchEvent')
    document.body.append(video, timeline)

    await drain(seekToBeginning(new AbortController().signal))

    expect(click).not.toHaveBeenCalled()
  })

  it('exits without error when timeline is missing', async () => {
    const video = createVideo(90)
    document.body.append(video)
    await drain(seekToBeginning(new AbortController().signal))
    expect(video.currentTime).toBe(90)
  })

  it('exits when no video appears before the find timeout', async () => {
    await drain(seekToBeginning(new AbortController().signal))
  })

  it('exits when aborted during settle', async () => {
    const video = createVideo(90)
    document.body.append(video)
    const controller = new AbortController()
    const promise = seekToBeginning(controller.signal)
    await flushPromises()
    controller.abort()
    await promise
    expect(video.currentTime).toBe(90)
  })
})
