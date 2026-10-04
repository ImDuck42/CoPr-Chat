import { protocolClient }                                                                                                            from './constants.js'
import { messageStreamFeed, emptyStatePlaceholder, messageCounterText }                                                              from './elements.js'
import { getAttachmentType, unpackZipPreviews }                                                                                      from './archive.js'
import { escapeHTML, getCurrentUser, isCoPrAdmin, getMemberDisplayName, getInitials, getAvatarColor, parsePayload, isSystemMessage } from './utils.js'
import { state, processSequence }                                                                                                    from './state.js'
import { playChime }                                                                                                                 from './audio.js'

export const resetFeedState = () => {
  messageStreamFeed.innerHTML = ''
  messageStreamFeed.appendChild(emptyStatePlaceholder)

  emptyStatePlaceholder.style.display = 'block'
  state.totalMessagesReceived         = 0
  messageCounterText.textContent      = '0'
  state.lowestLoadedSequence          = Infinity
  state.isLoadingOlderMessages        = false
  state.hasReachedHistoryStart        = false
}

export const renderAttachmentHtml = (fileUrl) => {
  const mediaType = getAttachmentType(fileUrl)
  if (!mediaType) return ''

  const filename = fileUrl.split('/').pop().split('?')[0] || 'Attachment'
  const wrapper  = (innerHtml) => `<div class="attachment-preview-box">${innerHtml}</div>`

  if (mediaType === 'image') {
    return wrapper(`
      <a href="${fileUrl}" target="_blank" rel="noopener">
        <img src="${fileUrl}" alt="Preview" loading="lazy" class="attachment-media attachment-image">
      </a>
    `)
  }

  if (mediaType === 'video') {
    return wrapper(`
      <video src="${fileUrl}" controls preload="metadata" class="attachment-media attachment-video"></video>
    `)
  }

  if (mediaType === 'audio') {
    return wrapper(`
      <audio src="${fileUrl}" controls class="attachment-media attachment-audio"></audio>
    `)
  }

  if (mediaType === 'zip') {
    return `
      <div class="attachment-preview-box" data-zip-url="${fileUrl}">
        <a href="${fileUrl}" target="_blank" rel="noopener" download class="attachment-download-card">
          <div class="file-icon"><i class="fa-solid fa-file-zipper"></i></div>
          <div class="file-info">
            <span class="file-name">${filename}</span>
            <span class="file-subtext">Multi-file bundle • Click to unpack</span>
          </div>
          <i class="fa-solid fa-arrow-down file-arrow"></i>
        </a>
        <div class="zip-contents-grid" style="display: none; margin-top: 8px; flex-wrap: wrap; gap: 8px;"></div>
      </div>`
  }

  return wrapper(`
    <a href="${fileUrl}" target="_blank" rel="noopener" download class="attachment-download-card">
      <div class="file-icon"><i class="fa-solid fa-file-arrow-down"></i></div>
      <div class="file-info">
        <span class="file-name">${filename}</span>
        <span class="file-subtext">Click to download</span>
      </div>
      <i class="fa-solid fa-arrow-down file-arrow"></i>
    </a>
  `)
}

export const parseMessageText = (rawText, currentUser) => {
  let safeHtml       = escapeHTML(rawText)
  const detectedUrls = []
  let hasPingedSelf  = false

  safeHtml = safeHtml.replace(/(https?:\/\/[^\s]+)/g, (fullUrl) => {
    detectedUrls.push(fullUrl)
    return `<a href="${fullUrl}" target="_blank" rel="noopener">${fullUrl}</a>`
  })

  safeHtml = safeHtml.replace(/@([a-zA-Z0-9_-]+)/g, (fullMatch, username) => {
    const isSelf = username === getMemberDisplayName(currentUser)
    if (isSelf) hasPingedSelf = true
    return `<span class="mention-badge ${isSelf ? 'mention-self' : ''}">@${username}</span>`
  })

  safeHtml = safeHtml.replace(/`([^`]+)`/g,       '<span class="code-snippet">$1</span>')
  safeHtml = safeHtml.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  const attachmentsHtml = detectedUrls.map(renderAttachmentHtml).join('')

  return { html: safeHtml, attachmentsHtml, hasPingedSelf }
}

export const renderMessageCard = ({ author, body, sequence, isValid = true, isPending = false, silent = false, shouldPrepend = false }) => {
  if (emptyStatePlaceholder) emptyStatePlaceholder.style.display = 'none'

  const currentUser                              = getCurrentUser()
  const isOwner                                  = isCoPrAdmin(author)
  const displayAuthor                            = getMemberDisplayName(author)
  const { html, attachmentsHtml, hasPingedSelf } = parseMessageText(body, currentUser)

  if (!silent && !isPending && sequence > state.audioWatermarkSequence) {
    if (hasPingedSelf) {
      playChime('mention')
      if (author !== currentUser && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`From ${displayAuthor}:`, { body: body, icon: './../assets/CoPr.png' })
      }
    } else if (author !== currentUser) {
      playChime('message')
    }
  }

  const messageClasses = [
    'message-card',
    hasPingedSelf ? 'highlight-mention' : '',
    !isValid      ? 'corrupt-message'   : '',
    isPending     ? 'is-pending'        : ''
  ].filter(Boolean).join(' ')

  const messageCard     = document.createElement('div')
  messageCard.className = messageClasses
  if (sequence) {
    messageCard.dataset.sequence = sequence
  }

  messageCard.innerHTML = `
    <div class="message-avatar${isOwner ? ' is-owner' : ''}" style="background:${isOwner ? '#000000' : getAvatarColor(author)}">
      ${getInitials(displayAuthor)}
    </div>
    <div class="message-content">
      <div class="message-header">
        <span class="sender-name">${escapeHTML(displayAuthor)}</span>
        ${!isValid ? '<span class="corrupt-tag">[CORRUPTED]</span>' : ''}
      </div>
      <div class="message-text">${html}</div>
      ${attachmentsHtml}
    </div>
  `

  messageCard.querySelectorAll('.attachment-preview-box[data-zip-url]').forEach((previewBox) => {
    unpackZipPreviews(previewBox, previewBox.dataset.zipUrl)
  })

  if (shouldPrepend && messageStreamFeed.firstElementChild) {
    messageStreamFeed.insertBefore(messageCard, messageStreamFeed.firstElementChild)
  } else {
    messageStreamFeed.appendChild(messageCard)
    if (!shouldPrepend) {
      messageStreamFeed.scrollTop = messageStreamFeed.scrollHeight
    }
  }

  state.totalMessagesReceived++
  messageCounterText.textContent = state.totalMessagesReceived

  return messageCard
}

export const loadOlderMessages = async () => {
  if (state.isLoadingOlderMessages || state.hasReachedHistoryStart || !state.activeChannel) return

  if (state.lowestLoadedSequence <= 1 || state.lowestLoadedSequence === Infinity) {
    state.hasReachedHistoryStart = true
    return
  }

  state.isLoadingOlderMessages = true

  const targetToSequence   = state.lowestLoadedSequence - 1
  const targetFromSequence = Math.max(1, targetToSequence - protocolClient.config.fetchRange + 1)

  if (targetFromSequence === 1) {
    state.hasReachedHistoryStart = true
  }

  try {
    const previousScrollHeight = messageStreamFeed.scrollHeight
    const olderMessages        = await protocolClient.fetchChannelHistory(state.activeChannel, targetFromSequence, targetToSequence)

    olderMessages.sort((itemA, itemB) => itemB.sequence - itemA.sequence)

    olderMessages.forEach((olderItem) => {
      if (!processSequence(olderItem.sequence)) return

      state.lowestLoadedSequence = Math.min(state.lowestLoadedSequence, olderItem.sequence)
      const { author, body }     = parsePayload(olderItem.payload)

      if (!isSystemMessage(body)) {
        renderMessageCard({
          author:        author,
          body:          body,
          sequence:      olderItem.sequence,
          isValid:       olderItem.isValid,
          silent:        true,
          shouldPrepend: true
        })
      }
    })

    messageStreamFeed.scrollTop = messageStreamFeed.scrollHeight - previousScrollHeight
  } catch (historyError) {
    console.warn('Failed to load older messages:', historyError)
  } finally {
    state.isLoadingOlderMessages = false
  }
}

export const removeMessagesBySequence = (sequenceList) => {
  if (sequenceList === 'all') {
    state.channelHistoryCache.delete(state.activeChannel)
    return resetFeedState()
  }

  const sequenceSet = new Set(sequenceList)
  const cachedList  = state.channelHistoryCache.get(state.activeChannel) || []

  state.channelHistoryCache.set(state.activeChannel, cachedList.filter((item) => !sequenceSet.has(item.sequence)))

  messageStreamFeed.querySelectorAll('.message-card').forEach((cardElement) => {
    if (sequenceSet.has(Number(cardElement.dataset.sequence))) {
      cardElement.remove()
    }
  })

  const remainingCards           = messageStreamFeed.querySelectorAll('.message-card').length
  state.totalMessagesReceived    = remainingCards
  messageCounterText.textContent = String(remainingCards)

  if (remainingCards === 0) {
    resetFeedState()
  }
}