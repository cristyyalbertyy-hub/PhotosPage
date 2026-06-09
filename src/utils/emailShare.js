import { createZipBlob, downloadBlob } from './pdfGenerator'

const RECIPIENT_KEY = 'photosPage-email-recipient'

export function getSavedRecipient() {
  return localStorage.getItem(RECIPIENT_KEY) || ''
}

export function saveRecipient(email) {
  localStorage.setItem(RECIPIENT_KEY, email.trim())
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

async function prepareAttachment(files, safeName) {
  if (files.length === 1) {
    return {
      blob: files[0].blob,
      name: files[0].name,
      mimeType: 'application/pdf',
    }
  }

  const zipBlob = await createZipBlob(files)
  return {
    blob: zipBlob,
    name: `${safeName}.zip`,
    mimeType: 'application/zip',
  }
}

export async function sendPdfByEmail({
  files,
  safeName,
  recipient,
  subject,
  body,
  attachHint,
}) {
  if (!recipient?.trim()) {
    throw new Error('NO_RECIPIENT')
  }

  if (!isValidEmail(recipient)) {
    throw new Error('INVALID_EMAIL')
  }

  const attachment = await prepareAttachment(files, safeName)
  const file = new File([attachment.blob], attachment.name, {
    type: attachment.mimeType,
  })

  const shareData = { title: subject, text: body, files: [file] }

  if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
    try {
      await navigator.share(shareData)
      return { method: 'share' }
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('SHARE_CANCELLED')
    }
  }

  downloadBlob(attachment.blob, attachment.name)

  const mailtoBody = attachHint ? `${body}\n\n---\n${attachHint}` : body
  const params = new URLSearchParams({
    subject,
    body: mailtoBody,
  })
  window.location.href = `mailto:${encodeURIComponent(recipient.trim())}?${params}`

  return { method: 'mailto' }
}
