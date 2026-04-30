import { app, BrowserWindow, ipcMain } from 'electron'
import { is } from '@electron-toolkit/utils'
import { autoUpdater, type ProgressInfo, type UpdateInfo } from 'electron-updater'

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not_available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface AppUpdateState {
  status: UpdateStatus
  currentVersion: string
  version?: string
  releaseName?: string
  releaseDate?: string
  releaseNotes?: string
  releaseUrl?: string
  downloadUrl?: string
  progress?: number
  error?: string
  canInstall?: boolean
}

interface GitHubRelease {
  tag_name: string
  name: string | null
  html_url: string
  published_at: string
  assets: { browser_download_url: string; name: string }[]
}

const owner = 'dobest1024'
const repo = 'WorkPulse'
const latestReleaseApiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`
const releasePageUrl = `https://github.com/${owner}/${repo}/releases/latest`

let configured = false
let updateState: AppUpdateState = {
  status: 'idle',
  currentVersion: app.getVersion()
}

function broadcastUpdateState(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('app:update-status', updateState)
  }
}

function setUpdateState(state: Partial<AppUpdateState>): AppUpdateState {
  updateState = {
    ...updateState,
    ...state,
    currentVersion: app.getVersion()
  }
  broadcastUpdateState()
  return updateState
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function normalizeVersion(version: string): string {
  return version.replace(/^v/i, '')
}

function compareVersions(left: string, right: string): number {
  const leftParts = normalizeVersion(left).split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0)
  const rightParts = normalizeVersion(right).split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0)
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }

  return 0
}

function releaseNotesToString(releaseNotes: UpdateInfo['releaseNotes']): string | undefined {
  if (typeof releaseNotes === 'string') return releaseNotes
  if (Array.isArray(releaseNotes)) {
    return releaseNotes
      .map((note) => note.note)
      .filter(Boolean)
      .join('\n')
  }
  return undefined
}

function updateInfoToState(status: UpdateStatus, info: UpdateInfo): AppUpdateState {
  return setUpdateState({
    status,
    version: info.version,
    releaseName: info.releaseName ?? undefined,
    releaseDate: info.releaseDate,
    releaseNotes: releaseNotesToString(info.releaseNotes),
    releaseUrl: releasePageUrl,
    downloadUrl: undefined,
    progress: undefined,
    error: undefined,
    canInstall: status === 'downloaded'
  })
}

async function checkLatestReleaseVersion(): Promise<AppUpdateState> {
  setUpdateState({ status: 'checking', error: undefined, progress: undefined })

  try {
    const response = await fetch(latestReleaseApiUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `WorkPulse/${app.getVersion()}`
      }
    })

    if (!response.ok) {
      throw new Error(`GitHub release check failed: ${response.status}`)
    }

    const release = (await response.json()) as GitHubRelease
    const version = normalizeVersion(release.tag_name)
    const installer = release.assets.find((asset) => {
      if (process.platform === 'darwin') return asset.name.endsWith('.dmg')
      if (process.platform === 'win32') return asset.name.endsWith('.exe')
      return asset.name.endsWith('.AppImage') || asset.name.endsWith('.deb')
    })

    if (compareVersions(version, app.getVersion()) > 0) {
      return setUpdateState({
        status: 'available',
        version,
        releaseName: release.name ?? release.tag_name,
        releaseDate: release.published_at,
        releaseUrl: release.html_url,
        downloadUrl: installer?.browser_download_url,
        error: undefined,
        canInstall: false
      })
    }

    return setUpdateState({
      status: 'not_available',
      version,
      releaseName: release.name ?? release.tag_name,
      releaseDate: release.published_at,
      releaseUrl: release.html_url,
      downloadUrl: installer?.browser_download_url,
      error: undefined,
      canInstall: false
    })
  } catch (error) {
    return setUpdateState({
      status: 'error',
      error: getErrorMessage(error),
      canInstall: false
    })
  }
}

export function configureAutoUpdater(): void {
  if (configured) return
  configured = true

  autoUpdater.setFeedURL({ provider: 'github', owner, repo })
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false

  autoUpdater.on('checking-for-update', () => {
    setUpdateState({ status: 'checking', error: undefined, progress: undefined, canInstall: false })
  })

  autoUpdater.on('update-available', (info) => {
    updateInfoToState('available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    updateInfoToState('not_available', info)
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    setUpdateState({
      status: 'downloading',
      progress: Math.round(progress.percent),
      error: undefined,
      canInstall: false
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    updateInfoToState('downloaded', info)
  })

  autoUpdater.on('error', (error) => {
    setUpdateState({
      status: 'error',
      error: getErrorMessage(error),
      canInstall: false
    })
  })
}

export async function checkForUpdates(): Promise<AppUpdateState> {
  if (is.dev) {
    return checkLatestReleaseVersion()
  }

  try {
    await autoUpdater.checkForUpdates()
    return updateState
  } catch (error) {
    return setUpdateState({
      status: 'error',
      error: getErrorMessage(error),
      canInstall: false
    })
  }
}

export function registerUpdateIpc(): void {
  ipcMain.handle('app:get-version', () => app.getVersion())
  ipcMain.handle('app:updates:get-state', () => updateState)
  ipcMain.handle('app:updates:check', () => checkForUpdates())
  ipcMain.handle('app:updates:install', () => {
    if (updateState.status !== 'downloaded') return false
    autoUpdater.quitAndInstall(false, true)
    return true
  })
}

export function startUpdateCheck(): void {
  if (is.dev) return

  setTimeout(() => {
    void checkForUpdates()
  }, 5000)
}
