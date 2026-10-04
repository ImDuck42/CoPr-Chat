import { protocolClient }                                from './constants.js'
import { discoveredRoomsContainer, refreshDiscoveryBtn } from './elements.js'
import { state }                                         from './state.js'

let onChannelSelectCallback = null

export const setChannelSelectHandler = (callback) => {
  onChannelSelectCallback = callback
}

export const updateChannelMarquees = () => {
  discoveredRoomsContainer.querySelectorAll('.channel-item').forEach((channelButton) => {
    const nameViewport = channelButton.querySelector('.channel-name')
    const firstCopy    = channelButton.querySelector('.channel-name-copy')
    const copySpacing  = parseFloat(getComputedStyle(firstCopy).paddingRight) || 0
    const textWidth    = firstCopy.scrollWidth - copySpacing
    channelButton.classList.toggle('has-overflow', textWidth > nameViewport.clientWidth)
  })
}

export const renderChannels = (channelList) => {
  discoveredRoomsContainer.innerHTML = ''

  if (!channelList || channelList.length === 0) {
    discoveredRoomsContainer.innerHTML = `
      <div class="empty-channels">
        <i class="fa-solid fa-folder-open"></i>
        <span>No public channels yet<br>Click sync or create one</span>
      </div>
    `
    return
  }

  const fragment = document.createDocumentFragment()

  channelList.forEach((channelName) => {
    const channelButton        = document.createElement('div')
    channelButton.className    = `channel-item ${channelName === state.activeChannel ? 'active' : ''}`
    channelButton.dataset.room = channelName

    channelButton.innerHTML = '<i class="fa-solid fa-hashtag"></i>'

    const nameViewport     = document.createElement('span')
    nameViewport.className = 'channel-name'
    const nameTrack        = document.createElement('span')
    nameTrack.className    = 'channel-name-track'

    for (let copyIndex = 0; copyIndex < 2; copyIndex++) {
      const nameCopy       = document.createElement('span')
      nameCopy.className   = 'channel-name-copy'
      nameCopy.textContent = channelName
      nameTrack.appendChild(nameCopy)
    }

    nameViewport.appendChild(nameTrack)
    channelButton.appendChild(nameViewport)

    channelButton.onclick = () => {
      if (onChannelSelectCallback) onChannelSelectCallback(channelName)
    }
    fragment.appendChild(channelButton)
  })

  discoveredRoomsContainer.appendChild(fragment)
  updateChannelMarquees()
}

export const scanChannels = async () => {
  const refreshIcon = refreshDiscoveryBtn.querySelector('i')
  refreshIcon.classList.add('fa-spin')

  try {
    state.allDiscoveredChannels = await protocolClient.discoverChannels()
    renderChannels(state.allDiscoveredChannels)
  } catch {
    renderChannels([])
  } finally {
    refreshIcon.classList.remove('fa-spin')
  }
}