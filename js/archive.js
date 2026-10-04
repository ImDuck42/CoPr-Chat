const crcTable = new Uint32Array(256).map((_, index) => {
  let currentCrc = index
  for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
    currentCrc = (currentCrc & 1) ? (0xEDB88320 ^ (currentCrc >>> 1)) : (currentCrc >>> 1)
  }
  return currentCrc
})

export const computeCrc32 = (dataArray) => {
  let crcValue = 0xFFFFFFFF
  for (let index = 0; index < dataArray.length; index++) {
    crcValue = crcTable[(crcValue ^ dataArray[index]) & 0xFF] ^ (crcValue >>> 8)
  }
  return (crcValue ^ 0xFFFFFFFF) >>> 0
}

export const createZipArchive = async (fileList) => {
  const archiveChunks  = []
  const centralRecords = []
  let   byteOffset     = 0

  for (const fileItem of fileList) {
    const binaryData = new Uint8Array(await fileItem.arrayBuffer())
    const nameBytes  = new TextEncoder().encode(fileItem.name)
    const crcValue   = computeCrc32(binaryData)

    const localHeader = new Uint8Array(30 + nameBytes.length)
    const localView   = new DataView(localHeader.buffer)

    localView.setUint32(0,  0x04034B50,        true)
    localView.setUint16(4,  20,                true)
    localView.setUint16(6,  0x0800,            true)
    localView.setUint32(14, crcValue,          true)
    localView.setUint32(18, binaryData.length, true)
    localView.setUint32(22, binaryData.length, true)
    localView.setUint16(26, nameBytes.length,  true)
    localHeader.set(nameBytes, 30)

    archiveChunks.push(localHeader, binaryData)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const centralView   = new DataView(centralHeader.buffer)

    centralView.setUint32(0,  0x02014B50,        true)
    centralView.setUint16(4,  20,                true)
    centralView.setUint16(6,  20,                true)
    centralView.setUint16(8,  0x0800,            true)
    centralView.setUint32(16, crcValue,          true)
    centralView.setUint32(20, binaryData.length, true)
    centralView.setUint32(24, binaryData.length, true)
    centralView.setUint16(28, nameBytes.length,  true)
    centralView.setUint32(42, byteOffset,        true)
    centralHeader.set(nameBytes,                 46)

    centralRecords.push(centralHeader)
    byteOffset += localHeader.length + binaryData.length
  }

  const centralDirectoryOffset = byteOffset
  centralRecords.forEach((record) => archiveChunks.push(record))

  const endRecord = new Uint8Array(22)
  const endView   = new DataView(endRecord.buffer)

  endView.setUint32(0,  0x06054B50,                                       true)
  endView.setUint16(8,  fileList.length,                                  true)
  endView.setUint16(10, fileList.length,                                  true)
  endView.setUint32(12, centralRecords.reduce((a, b) => a + b.length, 0), true)
  endView.setUint32(16, centralDirectoryOffset,                           true)

  archiveChunks.push(endRecord)

  return new File(
    [new Blob(archiveChunks)],
    `bundle_${fileList.length}_files.zip`,
    { type: 'application/zip' }
  )
}

export const getAttachmentType = (fileUrl) => {
  const extension = (fileUrl.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase()

  if (/^(png|jpe?g|gif|webp|svg|avif|bmp)$/.test(extension))   return 'image'
  if (/^(mp4|webm|ogg|mov)$/.test(extension))                  return 'video'
  if (/^(mp3|wav|m4a|aac|flac)$/.test(extension))              return 'audio'
  if (extension === 'zip')                                     return 'zip'
  if (fileUrl.includes('catbox.moe') || extension.length <= 5) return 'file'

  return null
}

export const unpackZipPreviews = async (containerNode, zipUrl) => {
  try {
    const fetchResponse = await fetch(zipUrl)
    if (!fetchResponse.ok) return

    const arrayBuffer = await fetchResponse.arrayBuffer()
    const dataView    = new DataView(arrayBuffer)
    const byteData    = new Uint8Array(arrayBuffer)

    let byteOffset = 0
    const mediaBlobs = []

    while (byteOffset + 30 <= byteData.length && dataView.getUint32(byteOffset, true) === 0x04034B50) {
      const compressionMethod = dataView.getUint16(byteOffset + 8,  true)
      const compressedSize    = dataView.getUint32(byteOffset + 18, true)
      const nameLength        = dataView.getUint16(byteOffset + 26, true)
      const extraLength       = dataView.getUint16(byteOffset + 28, true)

      const dataStart = byteOffset + 30 + nameLength + extraLength
      const dataEnd   = dataStart + compressedSize

      if (dataEnd > byteData.length) break

      if (compressionMethod === 0) {
        const nameBytes = byteData.subarray(byteOffset + 30, byteOffset + 30 + nameLength)
        const filename  = new TextDecoder().decode(nameBytes)
        const mediaType = getAttachmentType(filename)

        if (mediaType && !['file', 'zip'].includes(mediaType)) {
          const extension = filename.split('.').pop().toLowerCase()
          const mimeType  = `${mediaType}/${extension === 'svg' ? 'svg+xml' : extension}`
          const fileBlob  = new Blob([byteData.slice(dataStart, dataEnd)], { type: mimeType })

          mediaBlobs.push({
            type:    mediaType,
            name:    filename,
            blobUrl: URL.createObjectURL(fileBlob)
          })
        }
      }
      byteOffset = dataEnd
    }

    if (mediaBlobs.length > 0) {
      const gridElement = containerNode.querySelector('.zip-contents-grid')
      if (gridElement) {
        gridElement.style.display = 'flex'
        gridElement.innerHTML     = mediaBlobs.map((item) => {
          if (item.type === 'image') {
            return `<a href="${item.blobUrl}" target="_blank"><img src="${item.blobUrl}" alt="${item.name}" class="attachment-media attachment-image" style="max-height: 200px;"></a>`
          }
          if (item.type === 'video') {
            return `<video src="${item.blobUrl}" controls class="attachment-media attachment-video" style="max-height: 200px;"></video>`
          }
          if (item.type === 'audio') {
            return `<audio src="${item.blobUrl}" controls class="attachment-media attachment-audio"></audio>`
          }
          return ''
        }).join('')
      }
    }
  } catch (unpackError) {
    console.warn('Could not unpack zip preview:', unpackError)
  }
}

export const uploadToLitterbox = async (fileObject) => {
  const formData = new FormData()
  formData.append('reqtype',      'fileupload')
  formData.append('time',         '24h')
  formData.append('fileToUpload', fileObject)

  const uploadResponse = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
    method: 'POST',
    body:   formData
  })

  if (!uploadResponse.ok) {
    throw new Error('Litterbox upload request failed')
  }

  const uploadedUrl = (await uploadResponse.text()).trim()
  if (!uploadedUrl.startsWith('http')) {
    throw new Error('Invalid Litterbox response')
  }

  return uploadedUrl
}