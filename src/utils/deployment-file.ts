import type { DeploymentFile } from '@/types'

/** Per-file cap; mirrors the backend so the user gets the error before the request leaves. */
export const MAX_DEPLOYMENT_FILE_BYTES = 2 * 1024 * 1024

/**
 * A ``File`` as the deployment request carries it. ``content_b64`` is the
 * bare base64 payload without the ``data:…;base64,`` prefix
 * ``readAsDataURL`` adds — the backend decodes it with ``validate=True``
 * and cloud-init's ``encoding: b64`` takes it as is.
 */
export function readDeploymentFile(file: File): Promise<DeploymentFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const out = typeof reader.result === 'string' ? reader.result : ''
      const idx = out.indexOf('base64,')
      if (idx < 0) {
        reject(new Error('Failed to encode file'))
        return
      }
      resolve({
        name: file.name,
        content_b64: out.slice(idx + 'base64,'.length),
        size: file.size,
        content_type: file.type || 'application/octet-stream',
      })
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** ``accept`` attribute for a file variable's allowed extensions. */
export function acceptFor(extensions: readonly string[] | undefined): string {
  return extensions?.length ? extensions.map((e) => `.${e}`).join(',') : '*'
}
