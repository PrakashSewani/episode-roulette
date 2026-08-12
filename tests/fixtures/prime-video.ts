interface PrimeFixtureOptions {
  seasonNumber?: number
  episodeCount?: number
  playableCount?: number
  includeMainPlay?: boolean
  includeSeasonLinks?: boolean
}

export function createPrimeDetail({
  seasonNumber = 4,
  episodeCount = 8,
  playableCount = 3,
  includeMainPlay = true,
  includeSeasonLinks = true,
}: PrimeFixtureOptions = {}): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.dataset.testid = 'DVWebNode-detail-wrapper'
  const main = document.createElement('main')
  main.dataset.testid = 'detailpage-main'
  wrapper.append(main)

  if (includeMainPlay) {
    const playContainer = document.createElement('div')
    const play = document.createElement('a')
    play.dataset.testid = 'dp-atf-play-button'
    play.setAttribute('role', 'button')
    playContainer.append(play)
    main.append(playContainer)
  }

  const seasonSelector = document.createElement('div')
  seasonSelector.dataset.testid = 'dp-season-selector'
  const input = document.createElement('input')
  input.setAttribute('aria-label', `Season Selector. Season ${seasonNumber} is selected`)
  seasonSelector.append(input)
  if (includeSeasonLinks) {
    for (let season = 1; season <= 4; season += 1) {
      const link = document.createElement('a')
      link.href = `https://www.primevideo.com/detail/season-${season}`
      link.textContent = `Season ${season}`
      seasonSelector.append(link)
    }
  }
  main.append(seasonSelector)

  const tab = document.createElement('button')
  tab.dataset.testid = 'btf-episodes-tab'
  tab.setAttribute('role', 'tab')
  tab.setAttribute('aria-selected', 'true')
  main.append(tab)

  for (let episode = 1; episode <= episodeCount; episode += 1) {
    const row = document.createElement('li')
    row.dataset.testid = 'episode-list-item'
    const heading = document.createElement('h3')
    heading.textContent = `${episode}. Episode ${episode}`
    row.append(heading)
    if (episode <= playableCount) {
      const action = document.createElement('a')
      action.dataset.testid = 'episodes-playbutton'
      action.setAttribute('role', 'button')
      action.setAttribute('aria-label', `Play S${seasonNumber} E${episode}`)
      row.append(action)
    } else {
      row.append(document.createTextNode('COMING SOON'))
    }
    main.append(row)
  }

  return wrapper
}

export function createPrimePlayer(
  episodeInfo = 'S4 E1 Episode 1',
  loading = false,
): HTMLElement {
  const player = document.createElement('div')
  player.id = 'dv-web-player'
  const surface = document.createElement('div')
  surface.setAttribute('aria-label', 'Web Player')
  const info = document.createElement('div')
  info.className = 'atvwebplayersdk-episode-info'
  info.textContent = episodeInfo
  const timing = document.createElement('div')
  timing.className = 'atvwebplayersdk-episode-timing-container'
  timing.textContent = episodeInfo
  surface.append(info, timing)
  if (loading) {
    const overlay = document.createElement('div')
    overlay.className = 'atvwebplayersdk-loading-overlay'
    overlay.setAttribute('role', 'status')
    overlay.textContent = 'Loading'
    surface.append(overlay)
  }
  player.append(surface)
  return player
}
