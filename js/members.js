import { activeMembersList, memberCountBadge, chatMessageInput }                                      from './elements.js'
import { getCurrentUser, isCoPrAdmin, getMemberDisplayName, getInitials, getAvatarColor, escapeHTML } from './utils.js'
import { state }                                                                                      from './state.js'

export const renderMembersList = () => {
  const currentUser = getCurrentUser()
  state.currentMembersMap.set(currentUser, { online: true, lastActive: Date.now() })

  const onlineMembers = Array.from(state.currentMembersMap.entries())
    .filter(([, metaData])   => metaData.online)
    .sort(([userA], [userB]) => {
      const ownerA = isCoPrAdmin(userA)
      const ownerB = isCoPrAdmin(userB)
      if (ownerA !== ownerB) return ownerA ? -1 : 1
      return getMemberDisplayName(userA).localeCompare(getMemberDisplayName(userB))
    })

  memberCountBadge.textContent = onlineMembers.length

  if (onlineMembers.length === 0) {
    activeMembersList.innerHTML = `
      <div class="empty-members">
        <i class="fa-solid fa-users-slash"></i>
        <span>No active users</span>
      </div>
    `
    return
  }

  const fragment = document.createDocumentFragment()

  onlineMembers.forEach(([memberName]) => {
    const displayName    = getMemberDisplayName(memberName)
    const isOwner        = isCoPrAdmin(memberName)
    const memberItem     = document.createElement('div')
    memberItem.className = 'member-item'
    memberItem.title     = `${displayName} - Click to mention`

    memberItem.innerHTML = `
      <div class="member-avatar${isOwner ? ' is-owner' : ''}" style="background:${isOwner ? '#000000' : getAvatarColor(memberName)}">
        ${escapeHTML(getInitials(displayName))}
      </div>
      <span class="member-name">${escapeHTML(displayName)}</span>
    `

    memberItem.onclick = () => {
      chatMessageInput.value = `${chatMessageInput.value.trim()} @${displayName} `.trimStart()
      chatMessageInput.focus()
    }

    fragment.appendChild(memberItem)
  })

  activeMembersList.innerHTML = ''
  activeMembersList.appendChild(fragment)
}

export const setMemberStatus = (username, isOnline, timestamp = Date.now()) => {
  if (!username || username === 'Anonymous' || !state.activeChannel) return
  state.currentMembersMap.set(username, { online: isOnline, lastActive: timestamp })
  renderMembersList()
}

export const initMemberHeartbeat = () => {
  setInterval(() => {
    if (!state.activeChannel) return

    let hasChanged    = false
    const currentTime = Date.now()
    const myHandle    = getCurrentUser()

    state.currentMembersMap.forEach((metaData, memberName) => {
      if (memberName !== myHandle && metaData.online && (currentTime - metaData.lastActive > 90000)) {
        metaData.online = false
        hasChanged      = true
      }
    })

    if (hasChanged) {
      renderMembersList()
    }
  }, 15000)
}