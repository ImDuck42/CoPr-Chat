import { state } from './state.js'

let audioContext   = null
let compressorNode = null

export const initializeAudioContext = async () => {
  if (!audioContext) {
    audioContext   = new (window.AudioContext || window.webkitAudioContext)()
    compressorNode = audioContext.createDynamicsCompressor()

    compressorNode.threshold.setValueAtTime(-14, audioContext.currentTime)
    compressorNode.connect(audioContext.destination)
  }
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }
  return audioContext
}

export const playChime = async (chimeType = 'message') => {
  if (!state.soundEnabled) return

  try {
    const context   = await initializeAudioContext()
    const startTime = context.currentTime

    if (chimeType === 'mention') {
      const oscillatorOne = context.createOscillator()
      const oscillatorTwo = context.createOscillator()
      const gainNodeOne   = context.createGain()
      const gainNodeTwo   = context.createGain()

      oscillatorOne.type = 'triangle'
      oscillatorOne.frequency.setValueAtTime(659.25,            startTime)
      oscillatorOne.frequency.exponentialRampToValueAtTime(880, startTime + 0.08)

      gainNodeOne.gain.setValueAtTime(0.85,                startTime)
      gainNodeOne.gain.setValueAtTime(0.85,                startTime + 0.12)
      gainNodeOne.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5)

      oscillatorTwo.type = 'sine'
      oscillatorTwo.frequency.setValueAtTime(1318.5, startTime + 0.05)

      gainNodeTwo.gain.setValueAtTime(0.001,               startTime)
      gainNodeTwo.gain.setValueAtTime(0.65,                startTime + 0.06)
      gainNodeTwo.gain.setValueAtTime(0.65,                startTime + 0.15)
      gainNodeTwo.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45)

      oscillatorOne.connect(gainNodeOne).connect(compressorNode)
      oscillatorTwo.connect(gainNodeTwo).connect(compressorNode)

      oscillatorOne.start(startTime)
      oscillatorOne.stop(startTime + 0.52)

      oscillatorTwo.start(startTime + 0.05)
      oscillatorTwo.stop(startTime  + 0.47)
    } else {
      const oscillator = context.createOscillator()
      const gainNode   = context.createGain()

      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(523.25,               startTime)
      oscillator.frequency.exponentialRampToValueAtTime(783.99, startTime + 0.09)

      gainNode.gain.setValueAtTime(0.75,                startTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35)

      oscillator.connect(gainNode).connect(compressorNode)

      oscillator.start(startTime)
      oscillator.stop(startTime + 0.37)
    }
  } catch (audioError) {
    console.warn('Audio playback error:', audioError)
  }
}