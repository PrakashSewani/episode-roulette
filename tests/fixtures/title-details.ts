interface TitleDetailsOptions {
  episodic?: boolean
  hidden?: boolean
  metadata?: boolean
}

export function createTitleDetails({
  episodic = false,
  hidden = false,
  metadata = false,
}: TitleDetailsOptions = {}): HTMLElement {
  const root = document.createElement('div')
  root.dataset.uia = 'modal-motion-container-DETAIL_MODAL'
  root.setAttribute('role', 'dialog')

  if (hidden) {
    root.dataset.testHidden = 'true'
  }

  const structuralElement = document.createElement(metadata ? 'div' : 'button')
  structuralElement.dataset.uia = metadata
    ? 'previewModal--detailsMetadata'
    : 'play-button'
  root.append(structuralElement)

  if (episodic) {
    const episodeSelector = document.createElement('div')
    episodeSelector.dataset.uia = 'episode-selector'
    const episodeRow = document.createElement('div')
    episodeRow.dataset.uia = 'titleCard--container'
    episodeRow.setAttribute('role', 'button')
    episodeSelector.append(episodeRow)
    root.append(episodeSelector)
  }

  return root
}
