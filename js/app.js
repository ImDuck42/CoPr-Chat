import {
  publicDiscoveryToggle,
  stagedFilesContainer,
  fileAttachmentInput,
  messageCounterBadge,
  refreshDiscoveryBtn,
  searchChannelsInput,
  activeMembersList,
  connectChannelBtn,
  closeChangelogBtn,
  currentRoomHeader,
  messageStreamFeed,
  memberCountBadge,
  changelogContent,
  channelNameInput,
  chatMessageInput,
  toggleMembersBtn,
  userAvatarBadge,
  userHandleInput,
  copyRoomLinkBtn,
  acceptTermsBtn,
  changelogModal,
  sendMessageBtn,
  toggleAudioBtn,
  membersSidebar,
  attachFileBtn,
  leaveRoomBtn,
  changelogBtn,
  versionLabel,
  termsModal
} from './elements.js'
import {
  signalClearPrefix,
  litterboxMaxBytes,
  protocolVersion,
  protocolClient,
  signalDelete,
  signalLeave,
  signalJoin
} from './constants.js'
import {
  isSystemMessage,
  getCurrentUser,
  formatFileSize,
  getAvatarColor,
  parsePayload,
  getInitials
} from './utils.js'
import {
  removeMessagesBySequence,
  loadOlderMessages,
  renderMessageCard,
  parseMessageText,
  resetFeedState
} from './messages.js'
import {
  setChannelSelectHandler,
  updateChannelMarquees,
  renderChannels,
  scanChannels
} from './channels.js'
import {
  initMemberHeartbeat,
  renderMembersList,
  setMemberStatus
} from './members.js'
import {
  createZipArchive,
  uploadToLitterbox
} from './archive.js'
import {
  initializeAudioContext,
  playChime
} from './audio.js'
import {
  processSequence,
  state
} from './state.js'

if (versionLabel) {
  versionLabel.textContent = `Version: ${protocolVersion}`
}

const resetInputHeight = () => {
  chatMessageInput.value        = ''
  chatMessageInput.style.height = 'auto'
}

const refreshProfileAvatar = () => {
  const handleString = getCurrentUser()
  userAvatarBadge.textContent           = getInitials(handleString)
  userAvatarBadge.style.backgroundColor = getAvatarColor(handleString)
}

const ownerTag        = '{{CPA}}'
const handleNameLimit = 20

const limitHandleName = (handle) => {
  const ownerTagIndex = handle.indexOf(ownerTag)
  if (ownerTagIndex !== -1) {
    const name = handle.slice(0, ownerTagIndex) + handle.slice(ownerTagIndex + ownerTag.length)
    return name.length <= handleNameLimit ? handle : `${name.slice(0, handleNameLimit)}${ownerTag}`
  }

  let partialTagLength = 0
  for (let length = Math.min(ownerTag.length - 1, handle.length); length > 0; length--) {
    if (ownerTag.startsWith(handle.slice(-length))) {
      partialTagLength = length
      break
    }
  }

  const nameEnd = handle.length - partialTagLength
  if (nameEnd <= handleNameLimit) return handle
  return `${handle.slice(0, handleNameLimit)}${handle.slice(nameEnd)}`
}

const renderChangelog = (entries) => {
  changelogContent.replaceChildren()

  if (!Array.isArray(entries) || entries.length === 0) {
    const emptyState = document.createElement('p')
    emptyState.className   = 'changelog-state'
    emptyState.textContent = 'No changes have been published yet.'
    changelogContent.append(emptyState)
    return
  }

  const fragment = document.createDocumentFragment()

  entries.forEach((entry) => {
    const article     = document.createElement('article')
    article.className = 'changelog-entry'

    const heading     = document.createElement('div')
    heading.className = 'changelog-entry-heading'

    const title       = document.createElement('h3')
    title.textContent = entry.title || 'Update'
    heading.append(title)

    if (entry.date) {
      const date       = document.createElement('time')
      date.textContent = entry.date
      date.dateTime    = entry.date
      heading.append(date)
    } else if (entry.version) {
      const version       = document.createElement('span')
      version.className   = 'changelog-version'
      version.textContent = entry.version
      heading.append(version)
    }

    article.append(heading)

    if (entry.description) {
      const description       = document.createElement('p')
      description.textContent = entry.description
      article.append(description)
    }

    if (Array.isArray(entry.changes) && entry.changes.length > 0) {
      const changeList = document.createElement('ul')
      entry.changes.forEach((change) => {
        const item       = document.createElement('li')
        item.textContent = change
        changeList.append(item)
      })
      article.append(changeList)
    }

    fragment.append(article)
  })

  changelogContent.append(fragment)
}

const openChangelog = async () => {
  changelogModal.hidden = false
  changelogContent.replaceChildren()
  const loadingState       = document.createElement('p')
  loadingState.className   = 'changelog-state'
  loadingState.textContent = 'Loading changes...'
  changelogContent.append(loadingState)
  closeChangelogBtn.focus()

  try {
    const response = await fetch('./assets/changes.json', { cache: 'no-store' })
    if (!response.ok) throw new Error(`Changelog request failed: ${response.status}`)
    renderChangelog(await response.json())
  } catch {
    const errorState       = document.createElement('p')
    errorState.className   = 'changelog-state'
    errorState.textContent = 'Changes could not be loaded. Please try again later.'
    changelogContent.replaceChildren(errorState)
  }
}

const closeChangelog = () => {
  changelogModal.hidden = true
  changelogBtn.focus()
}

const renderStagedFiles = () => {
  if (state.stagedFiles.length === 0) {
    stagedFilesContainer.style.display = 'none'
    return
  }

  stagedFilesContainer.style.display = 'flex'
  stagedFilesContainer.innerHTML     = ''

  const fragment = document.createDocumentFragment()
  let totalBytes = 0

  state.stagedFiles.forEach((fileItem, index) => {
    totalBytes += fileItem.size

    const chipElement     = document.createElement('div')
    chipElement.className = 'staged-chip'
    chipElement.innerHTML = `
      <i class="fa-solid fa-file"></i>
      <span class="chip-name" title="${fileItem.name}">${fileItem.name}</span>
      <span class="chip-size">${formatFileSize(fileItem.size)}</span>
      <button class="chip-remove-btn" type="button" title="Remove file">&times;</button>
    `

    chipElement.querySelector('.chip-remove-btn').onclick = () => {
      state.stagedFiles.splice(index, 1)
      renderStagedFiles()
    }

    fragment.appendChild(chipElement)
  })

  const metaBadgeElement       = document.createElement('div')
  metaBadgeElement.className   = 'staged-tray-meta'
  metaBadgeElement.textContent = `${state.stagedFiles.length} file${state.stagedFiles.length > 1 ? 's' : ''} (${formatFileSize(totalBytes)} / 1 GB)`

  fragment.appendChild(metaBadgeElement)
  stagedFilesContainer.appendChild(fragment)
}

export const joinChannel = async (channelName) => {
  const targetChannel = String(channelName).trim()
  if (!targetChannel) return

  if (state.channelListenerUnsubscribe) {
    state.channelListenerUnsubscribe()
  }

  state.activeChannel           = targetChannel
  state.audioWatermarkSequence  = Infinity
  currentRoomHeader.textContent = state.activeChannel

  chatMessageInput.disabled    = false
  attachFileBtn.disabled       = false
  sendMessageBtn.disabled      = false
  chatMessageInput.placeholder = `Message #${state.activeChannel}...`

  chatMessageInput.focus()
  copyRoomLinkBtn.style.display     = 'inline-flex'
  leaveRoomBtn.style.display        = 'inline-flex'
  messageCounterBadge.style.display = 'inline-flex'

  resetFeedState()
  state.seenSequences.clear()

  document.querySelectorAll('.channel-item').forEach((buttonElement) => {
    buttonElement.classList.toggle('active', buttonElement.dataset.room === state.activeChannel)
  })

  if (!state.channelMembersCache.has(state.activeChannel)) {
    state.channelMembersCache.set(state.activeChannel, new Map())
  }
  state.currentMembersMap = state.channelMembersCache.get(state.activeChannel)
  renderMembersList()

  const cachedMessages = state.channelHistoryCache.get(state.activeChannel) || []
  state.channelHistoryCache.set(state.activeChannel, cachedMessages)
  let highestSequence  = 0

  cachedMessages.forEach((cachedItem) => {
    if (cachedItem.sequence) {
      state.seenSequences.add(cachedItem.sequence)
      highestSequence            = Math.max(highestSequence, cachedItem.sequence)
      state.lowestLoadedSequence = Math.min(state.lowestLoadedSequence, cachedItem.sequence)
    }
    renderMessageCard({ ...cachedItem, silent: true })
  })

  const latestServerSeq        = await protocolClient.getChannelSequence(state.activeChannel)
  state.audioWatermarkSequence = latestServerSeq

  if (latestServerSeq > highestSequence) {
    try {
      const startSequence = highestSequence > 0
        ? highestSequence + 1
        : Math.max(1, latestServerSeq - protocolClient.config.fetchRange + 1)

      const missingDelta = await protocolClient.fetchChannelHistory(state.activeChannel, startSequence, latestServerSeq)

      missingDelta.forEach((deltaItem) => {
        if (!processSequence(deltaItem.sequence)) return

        if (deltaItem.sequence) {
          state.lowestLoadedSequence = Math.min(state.lowestLoadedSequence, deltaItem.sequence)
        }

        const { author, body } = parsePayload(deltaItem.payload)

        if (isSystemMessage(body)) return

        if (author !== getCurrentUser() && !state.currentMembersMap.has(author)) {
          state.currentMembersMap.set(author, { online: false, lastActive: 0 })
        }

        const messageObject = {
          author:    author,
          body:      body,
          timestamp: deltaItem.timestamp || Date.now(),
          sequence:  deltaItem.sequence,
          isValid:   deltaItem.isValid
        }

        cachedMessages.push(messageObject)
        renderMessageCard({ ...messageObject, silent: true })
      })

      if (startSequence <= 1) {
        state.hasReachedHistoryStart = true
      }

      state.channelHistoryCache.set(state.activeChannel, cachedMessages)
      renderMembersList()
    } catch (syncError) {
      console.warn('History synchronization error:', syncError)
    }
  }

  while (!state.hasReachedHistoryStart && messageStreamFeed.scrollHeight <= messageStreamFeed.clientHeight) {
    await loadOlderMessages()
  }

  protocolClient.sendMessage(state.activeChannel, `[${getCurrentUser()}]: ${signalJoin}`).catch(() => {})

  state.channelListenerUnsubscribe = protocolClient.listenToChannel(state.activeChannel, (eventData) => {
    if (eventData.isResetState) {
      resetFeedState()
      state.seenSequences.clear()
      state.currentMembersMap.clear()
      state.channelHistoryCache.delete(state.activeChannel)
      state.channelHistoryCache.set(state.activeChannel, [])
      renderMembersList()
      return
    }

    if (!processSequence(eventData.sequence)) return

    const { author, body } = parsePayload(eventData.payload)

    if (body === signalLeave) return setMemberStatus(author, false, 0)
    if (body === signalJoin)  return setMemberStatus(author, true, Date.now())

    if (body.startsWith(signalClearPrefix)) {
      const sequencePayload = body.slice(signalClearPrefix.length)
      if (sequencePayload === 'all') {
        return removeMessagesBySequence('all')
      } else {
        const sequencesArray = sequencePayload.split(',').map(Number).filter(Number.isFinite)
        return removeMessagesBySequence(sequencesArray)
      }
    }

    if (body === signalDelete) {
      state.channelHistoryCache.delete(state.activeChannel)
      state.channelMembersCache.delete(state.activeChannel)
      state.allDiscoveredChannels = state.allDiscoveredChannels.filter((item) => item !== state.activeChannel)

      renderChannels(state.allDiscoveredChannels)
      return leaveChannel(false)
    }

    setMemberStatus(author, true, Date.now())

    const messageObject = {
      author:    author,
      body:      body,
      timestamp: eventData.timestamp || Date.now(),
      sequence:  eventData.sequence,
      isValid:   eventData.isValid
    }

    state.channelHistoryCache.get(state.activeChannel).push(messageObject)
    renderMessageCard(messageObject)
  })
}

export const leaveChannel = async (announcePeers = true) => {
  if (state.activeChannel && announcePeers) {
    await protocolClient.sendMessage(state.activeChannel, `[${getCurrentUser()}]: ${signalLeave}`).catch(() => {})
  }

  if (state.channelListenerUnsubscribe) {
    state.channelListenerUnsubscribe()
    state.channelListenerUnsubscribe = null
  }

  state.activeChannel           = ''
  state.audioWatermarkSequence  = Infinity
  currentRoomHeader.textContent = "This ain't no chat"

  chatMessageInput.disabled         = true
  attachFileBtn.disabled            = true
  sendMessageBtn.disabled           = true
  chatMessageInput.placeholder      = 'Select a channel to start chatting...'
  chatMessageInput.style.height     = 'auto'
  copyRoomLinkBtn.style.display     = 'none'
  leaveRoomBtn.style.display        = 'none'
  messageCounterBadge.style.display = 'none'

  state.stagedFiles.length = 0
  renderStagedFiles()
  resetFeedState()
  state.seenSequences.clear()
  state.currentMembersMap.clear()

  activeMembersList.innerHTML = `
    <div class="empty-members">
      <i class="fa-solid fa-users-slash"></i>
      <span>Not in an active channel</span>
    </div>
  `
  memberCountBadge.textContent = '0'

  document.querySelectorAll('.channel-item').forEach((buttonElement) => {
    buttonElement.classList.remove('active')
  })
}

const handleClearCommand = async (countToClear) => {
  if (!state.activeChannel) return

  const targetChannel = state.activeChannel
  const maxSequence   = await protocolClient.getChannelSequence(targetChannel)
  const channelCache  = state.channelHistoryCache.get(targetChannel) || []
  const wipeCount     = parseInt(countToClear, 10)

  if (!wipeCount || wipeCount >= channelCache.length) {
    const allSequences = Array.from({ length: maxSequence }, (_, index) => index + 1)
    await protocolClient.deleteMessages(targetChannel, allSequences)
    await protocolClient.sendMessage(targetChannel, `[${getCurrentUser()}]: ${signalClearPrefix}all`).catch(() => {})

    state.channelHistoryCache.delete(targetChannel)
    return resetFeedState()
  }

  const removedMessages  = channelCache.slice(-wipeCount).filter((message) => message.sequence)
  const removedSequences = removedMessages.map((message) => message.sequence)

  await protocolClient.deleteMessages(targetChannel, removedSequences)
  await protocolClient.sendMessage(targetChannel, `[${getCurrentUser()}]: ${signalClearPrefix}${removedSequences.join(',')}`).catch(() => {})
  removeMessagesBySequence(removedSequences)
}

const handleDeleteCommand = async () => {
  if (!state.activeChannel) return

  const targetChannel = state.activeChannel

  await protocolClient.sendMessage(targetChannel, `[${getCurrentUser()}]: ${signalDelete}`).catch(() => {})
  await protocolClient.destroyChannel(targetChannel)

  state.channelHistoryCache.delete(targetChannel)
  state.channelMembersCache.delete(targetChannel)

  state.allDiscoveredChannels = state.allDiscoveredChannels.filter((channel) => channel !== targetChannel)
  renderChannels(state.allDiscoveredChannels)

  await leaveChannel(false)
  await scanChannels()
}

const dispatchMessage = async () => {
  const messageText = chatMessageInput.value.trim()

  if (!state.activeChannel || (!messageText && state.stagedFiles.length === 0)) return

  const clearRegexMatch = messageText.match(/^\/clear(?:\s+(\d+))?$/i)
  if (clearRegexMatch) {
    resetInputHeight()
    return handleClearCommand(clearRegexMatch[1])
  }

  if (messageText.toLowerCase() === '/delete') {
    resetInputHeight()
    return handleDeleteCommand()
  }

  const currentUser = getCurrentUser()
  resetInputHeight()

  let uploadedFileUrl = ''

  if (state.stagedFiles.length > 0) {
    const originalSendIcon   = sendMessageBtn.innerHTML
    sendMessageBtn.disabled  = true
    attachFileBtn.disabled   = true
    sendMessageBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'

    try {
      const fileToUpload = state.stagedFiles.length === 1 ? state.stagedFiles[0] : await createZipArchive(state.stagedFiles)
      uploadedFileUrl    = await uploadToLitterbox(fileToUpload)
      state.stagedFiles.length = 0
      renderStagedFiles()
    } catch (uploadError) {
      console.error('Upload failed:', uploadError)
      alert('Failed to upload file(s). Please try again.')

      chatMessageInput.value   = messageText
      sendMessageBtn.disabled  = false
      attachFileBtn.disabled   = false
      sendMessageBtn.innerHTML = originalSendIcon
      return
    } finally {
      sendMessageBtn.disabled  = false
      attachFileBtn.disabled   = false
      sendMessageBtn.innerHTML = originalSendIcon
    }
  }

  const finalMessageBody  = [messageText, uploadedFileUrl].filter(Boolean).join('\n')
  const { hasPingedSelf } = parseMessageText(finalMessageBody, currentUser)

  if (hasPingedSelf) {
    playChime('mention')
  }

  const messageObject = {
    author:    currentUser,
    body:      finalMessageBody,
    timestamp: Date.now(),
    sequence:  null,
    isValid:   true
  }

  const optimisticCard = renderMessageCard({ ...messageObject, isPending: true, silent: true })

  try {
    const { sequence } = await protocolClient.sendMessage(state.activeChannel, `[${currentUser}]: ${finalMessageBody}`)

    if (sequence) {
      state.seenSequences.add(sequence)

      optimisticCard.classList.remove('is-pending')
      optimisticCard.dataset.sequence = sequence
      messageObject.sequence          = sequence

      state.channelHistoryCache.get(state.activeChannel).push(messageObject)
    }
  } catch (error) {
    console.error('Failed to send message:', error.message)
    optimisticCard.style.borderColor = '#ef4444'
    optimisticCard.title             = error.message
    optimisticCard.classList.add('corrupt-message')
  }
}

setChannelSelectHandler(joinChannel)
window.addEventListener('resize', updateChannelMarquees)

fileAttachmentInput.addEventListener('change', () => {
  let currentTotalBytes = state.stagedFiles.reduce((sum, file) => sum + file.size, 0)
  let refusedFileCount  = 0

  const chosenFiles = Array.from(fileAttachmentInput.files || [])

  chosenFiles.forEach((fileItem) => {
    if (currentTotalBytes + fileItem.size > litterboxMaxBytes) {
      refusedFileCount++
      return
    }
    state.stagedFiles.push(fileItem)
    currentTotalBytes += fileItem.size
  })

  if (refusedFileCount > 0) {
    alert(`Refused ${refusedFileCount} file(s): combined upload would exceed the 1 GB maximum.`)
  }

  renderStagedFiles()
  fileAttachmentInput.value = ''
})

messageStreamFeed.addEventListener('scroll', () => {
  if (messageStreamFeed.scrollTop <= 50) {
    loadOlderMessages()
  }
})

chatMessageInput.addEventListener('keydown', (keyboardEvent) => {
  if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
    keyboardEvent.preventDefault()
    dispatchMessage()
  }
})

chatMessageInput.addEventListener('input', () => {
  chatMessageInput.style.height = 'auto'
  chatMessageInput.style.height = `${Math.min(chatMessageInput.scrollHeight, 140)}px`
})

toggleMembersBtn.addEventListener('click', () => {
  membersSidebar.classList.toggle('is-hidden')
})

userHandleInput.value = `copr${Math.floor(Math.random() * 899 + 100)}`
state.previousHandle  = getCurrentUser()
refreshProfileAvatar()

userHandleInput.addEventListener('input', () => {
  const limitedHandle = limitHandleName(userHandleInput.value)
  if (limitedHandle !== userHandleInput.value) userHandleInput.value = limitedHandle

  const currentHandle = getCurrentUser()
  if (currentHandle !== state.previousHandle) {
    state.currentMembersMap.delete(state.previousHandle)
    state.previousHandle = currentHandle
  }

  refreshProfileAvatar()
  renderMembersList()
})

toggleAudioBtn.addEventListener('click', async () => {
  state.soundEnabled = !state.soundEnabled

  toggleAudioBtn.classList.toggle('active', state.soundEnabled)
  toggleAudioBtn.innerHTML = state.soundEnabled
    ? '<i class="fa-solid fa-bell"></i>'
    : '<i class="fa-solid fa-bell-slash"></i>'

  if (state.soundEnabled) {
    await playChime('mention')
  }
})

connectChannelBtn.addEventListener('click', async () => {
  const newChannel = channelNameInput.value.trim()
  if (!newChannel) return

  if (publicDiscoveryToggle.checked && !state.allDiscoveredChannels.includes(newChannel)) {
    await protocolClient.registerChannel(newChannel)
    state.allDiscoveredChannels.push(newChannel)
    renderChannels(state.allDiscoveredChannels)
  }

  joinChannel(newChannel)
  channelNameInput.value = ''
})

channelNameInput.addEventListener('keydown', (keyboardEvent) => {
  if (keyboardEvent.key === 'Enter') {
    keyboardEvent.preventDefault()
    keyboardEvent.stopPropagation()
    connectChannelBtn.click()
  }
})

acceptTermsBtn.addEventListener('click', async () => {
  await initializeAudioContext()

  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission()
  }

  termsModal.style.display = 'none'
  playChime('mention')
})

changelogBtn.addEventListener('click', openChangelog)
closeChangelogBtn.addEventListener('click', closeChangelog)
changelogModal.addEventListener('click', (mouseEvent) => {
  if (mouseEvent.target === changelogModal) closeChangelog()
})
window.addEventListener('keydown', (keyboardEvent) => {
  if (keyboardEvent.key === 'Escape' && !changelogModal.hidden) closeChangelog()
})

attachFileBtn.addEventListener('click', () => {
  if (state.activeChannel) {
    fileAttachmentInput.click()
  }
})

sendMessageBtn.addEventListener('click', dispatchMessage)

copyRoomLinkBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(state.activeChannel)
})

leaveRoomBtn.addEventListener('click', () => leaveChannel())
refreshDiscoveryBtn.addEventListener('click', scanChannels)

searchChannelsInput.addEventListener('input', (inputEvent) => {
  const searchQuery = inputEvent.target.value
  renderChannels(state.allDiscoveredChannels.filter((channel) => channel.includes(searchQuery)))
})

window.addEventListener('beforeunload', () => {
  if (state.activeChannel) {
    protocolClient.sendMessage(state.activeChannel, `[${getCurrentUser()}]: ${signalLeave}`).catch(() => {})
  }
})

window.addEventListener('click',   initializeAudioContext, { once: true })
window.addEventListener('keydown', initializeAudioContext, { once: true })

initMemberHeartbeat()
setInterval(scanChannels, 60000)
scanChannels()