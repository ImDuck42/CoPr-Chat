import { signalLeave, signalJoin, signalDelete, signalClearPrefix } from './constants.js'
import { avatarColors }                                             from './constants.js'
import { userHandleInput }                                          from './elements.js'

export const getCurrentUser = () => userHandleInput.value.trim() || 'Anonymous'

export const isCoPrAdmin          = (memberName) => memberName.includes('{{CPA}}')
export const getMemberDisplayName = (memberName) => memberName.replace('{{CPA}}', '').trim()

export const getInitials = (name) => {
  return (name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2) || 'CP').toUpperCase()
}

export const escapeHTML = (str) => {
  const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return String(str || '').replace(/[&<>"']/g, (match) => entityMap[match])
}

export const getAvatarColor = (name) => {
  let hash = 0
  for (let index = 0; index < name.length; index++) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

export const formatFileSize = (bytes) => {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

export const parsePayload = (payload = '') => {
  const match = payload.match(/^\[(.*?)\]:\s*([\s\S]*)$/)
  if (match) {
    return { author: match[1], body: match[2] }
  }
  return { author: 'Anonymous', body: payload }
}

export const isSystemMessage = (msg) => {
  return [signalLeave, signalJoin, signalDelete].includes(msg) || msg.startsWith(signalClearPrefix)
}