export const state = {
  activeChannel:              '',
  channelListenerUnsubscribe: null,
  soundEnabled:               true,
  allDiscoveredChannels:      [],
  totalMessagesReceived:      0,
  audioWatermarkSequence:     Infinity,
  lowestLoadedSequence:       Infinity,
  isLoadingOlderMessages:     false,
  hasReachedHistoryStart:     false,

  channelHistoryCache: new Map(),
  channelMembersCache: new Map(),
  seenSequences:       new Set(),
  stagedFiles:         [],
  currentMembersMap:   new Map(),
  previousHandle:      ''
}

export const processSequence = (sequence) => {
  if (!sequence) return true
  if (state.seenSequences.has(sequence)) return false
  state.seenSequences.add(sequence)
  return true
}