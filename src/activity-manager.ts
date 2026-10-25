/**
 * Activity Manager
 * Tracks VS Code activity and updates the Discord presence
 *
 * @author Extrise
 * @license MIT
 */

import type { Activity } from "discord-rpc"
import * as vscode from "vscode"
import { LARGE_IMAGE_KEY } from "./constants.js"
import type { ConfigManager } from "./config.js"
import type { DiscordClient } from "./discord-client.js"
import {
  extractRepoName,
  formatIssueText,
  formatTemplate,
  getFileName,
  getLanguageIcon,
  toGitHubHttpsUrl,
} from "./util.js"

/** How often the idle state is checked. */
const IDLE_CHECK_INTERVAL_MS = 30000
/** How long the GitHub repository URL is cached before re-resolving. */
const REPO_CACHE_MS = 60000

/** Minimal shape of the vscode.git extension API used here. */
interface GitApi {
  getAPI(version: number): {
    repositories: Array<{
      state: {
        remotes: Array<{
          name: string
          fetchUrl?: string
          pushUrl?: string
        }>
      }
    }>
  }
}

/**
 * Manages VS Code activity tracking and Discord presence updates
 */
export class ActivityManager {
  private startTimestamp = Date.now()
  private lastActivityTime = Date.now()
  private lastPresenceUpdate = 0
  private active = false
  private idle = false
  private idleCheckInterval: NodeJS.Timeout | undefined
  private pendingUpdate: NodeJS.Timeout | undefined
  private currentEditor: vscode.TextEditor | undefined
  private gitRepoUrl: string | undefined
  private lastRepoUrlCheck = 0
  private disposables: vscode.Disposable[] = []

  constructor(
    private readonly discordClient: DiscordClient,
    private readonly config: ConfigManager,
  ) {}

  /**
   * Start tracking VS Code activity.
   * Registers event listeners for editor changes.
   */
  start(): void {
    if (this.active) {
      return
    }

    this.active = true
    this.idle = false
    this.startTimestamp = Date.now()
    this.lastActivityTime = Date.now()

    // Track active text editor changes (immediate update so switching files feels instant)
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this.currentEditor = editor
        // Switching files is user activity: it must also leave the idle state,
        // otherwise the idle timer re-triggers and overwrites the new presence
        this.recordActivity(true)
      }),
    )

    // Track text document changes (typing) - throttled by the update interval
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(() => {
        this.recordActivity(false)
      }),
    )

    // Track when the editor gets focus
    this.disposables.push(
      vscode.window.onDidChangeWindowState((state) => {
        if (state.focused) {
          this.recordActivity(false)
        }
      }),
    )

    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics(() => {
        // Diagnostics are not user activity; they must not wake the idle state
        if (!this.idle) {
          this.schedulePresenceUpdate(false)
        }
      }),
    )

    // Check for idle state periodically
    this.idleCheckInterval = setInterval(() => {
      this.checkIdleState()
    }, IDLE_CHECK_INTERVAL_MS)

    // Set initial presence based on the current editor
    this.currentEditor = vscode.window.activeTextEditor
    this.schedulePresenceUpdate(true)
  }

  /**
   * Stop tracking activity and clear the presence
   */
  stop(): void {
    if (!this.active) {
      return
    }

    this.active = false
    this.idle = false

    this.cancelPendingUpdate()

    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval)
      this.idleCheckInterval = undefined
    }

    // Clear all event listeners
    this.disposables.forEach((disposable) => disposable.dispose())
    this.disposables = []

    // Clear the Discord presence
    void this.discordClient.clearActivity()
  }

  /**
   * Refresh the presence with current settings.
   * Useful when the configuration changes.
   */
  refresh(): void {
    if (this.active) {
      this.schedulePresenceUpdate(true)
    }
  }

  /**
   * Check if activity tracking is active
   */
  isActive(): boolean {
    return this.active
  }

  /**
   * Record user activity and refresh the presence.
   * Returning from idle always updates immediately.
   */
  private recordActivity(immediate: boolean): void {
    this.lastActivityTime = Date.now()

    if (this.idle) {
      this.idle = false
      immediate = true
    }

    this.schedulePresenceUpdate(immediate)
  }

  /**
   * Send a presence update to Discord, throttled by the configured
   * update interval so rapid events (e.g. typing) don't spam the RPC socket.
   * Immediate updates bypass the throttle; at most one update stays queued.
   */
  private schedulePresenceUpdate(immediate: boolean): void {
    if (!this.active) {
      return
    }

    const interval = this.config.getUpdateInterval()
    const elapsed = Date.now() - this.lastPresenceUpdate

    if (immediate || elapsed >= interval) {
      this.cancelPendingUpdate()
      this.lastPresenceUpdate = Date.now()
      void this.updatePresence()
      return
    }

    if (this.pendingUpdate) {
      return
    }

    this.pendingUpdate = setTimeout(() => {
      this.pendingUpdate = undefined
      this.lastPresenceUpdate = Date.now()
      void this.updatePresence()
    }, interval - elapsed)
  }

  /**
   * Drop a queued (throttled) presence update, if any
   */
  private cancelPendingUpdate(): void {
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate)
      this.pendingUpdate = undefined
    }
  }

  /**
   * Switch the presence to the idle state after inactivity.
   * Normal presence is restored automatically on the next activity.
   */
  private checkIdleState(): void {
    if (!this.active || this.idle) {
      return
    }

    const idleTimeout = this.config.getIdleTimeout()

    if (idleTimeout > 0 && Date.now() - this.lastActivityTime > idleTimeout) {
      this.idle = true
      this.cancelPendingUpdate()
      void this.discordClient.setActivity({
        details: "Idle",
        state: "Away from keyboard",
        startTimestamp: this.startTimestamp,
        largeImageKey: LARGE_IMAGE_KEY,
        instance: false,
      })
    }
  }

  /**
   * Get the GitHub repository URL from the Git configuration,
   * preferring the "origin" remote. Result is cached for a minute.
   */
  private async getGitHubRepoUrl(): Promise<string | undefined> {
    const now = Date.now()

    if (this.gitRepoUrl !== undefined && now - this.lastRepoUrlCheck < REPO_CACHE_MS) {
      return this.gitRepoUrl
    }

    this.lastRepoUrlCheck = now

    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
      if (!workspaceFolder) {
        this.gitRepoUrl = undefined
        return undefined
      }

      const gitExtension = vscode.extensions.getExtension("vscode.git")
      if (!gitExtension) {
        this.gitRepoUrl = undefined
        return undefined
      }

      const git = (gitExtension.isActive ? gitExtension.exports : await gitExtension.activate()) as GitApi
      const repositories = git.getAPI(1).repositories

      if (repositories.length === 0) {
        this.gitRepoUrl = undefined
        return undefined
      }

      const remotes = repositories[0].state.remotes
      const origin = remotes.find((remote) => remote.name === "origin")
      const orderedRemotes = origin ? [origin, ...remotes.filter((remote) => remote !== origin)] : remotes

      for (const remote of orderedRemotes) {
        const url = remote.fetchUrl ?? remote.pushUrl

        if (url && url.includes("github.com")) {
          this.gitRepoUrl = toGitHubHttpsUrl(url)
          return this.gitRepoUrl
        }
      }

      this.gitRepoUrl = undefined
      return undefined
    } catch {
      // Git is not available or not a repository
      this.gitRepoUrl = undefined
      return undefined
    }
  }

  /**
   * Get the issue count for the current file
   */
  private getIssueCount(): { errors: number; warnings: number } {
    if (!this.currentEditor) {
      return { errors: 0, warnings: 0 }
    }

    const diagnostics = vscode.languages.getDiagnostics(this.currentEditor.document.uri)

    let errors = 0
    let warnings = 0

    for (const diagnostic of diagnostics) {
      if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
        errors++
      } else if (diagnostic.severity === vscode.DiagnosticSeverity.Warning) {
        warnings++
      }
    }

    return { errors, warnings }
  }

  /**
   * Build the presence payload from the current activity and settings,
   * then send it to Discord
   */
  private async updatePresence(): Promise<void> {
    // While idle the "Idle / Away from keyboard" presence stands; a queued or
    // racing update must not overwrite it
    if (!this.active || this.idle || !this.discordClient.isConnected()) {
      return
    }

    const editor = this.currentEditor
    const fileName = editor ? getFileName(editor.document.fileName) : "No file open"
    const languageId = editor?.document.languageId || "plaintext"
    const workspaceName = this.getWorkspaceName()

    const githubUrl = this.config.shouldShowGitHubRepo() ? await this.getGitHubRepoUrl() : undefined
    const repoName = githubUrl ? extractRepoName(githubUrl) : undefined
    const issueText = this.config.shouldShowIssues() ? formatIssueText(this.getIssueCount()) : ""
    const languageIcon = getLanguageIcon(languageId)

    let details = formatTemplate(this.config.getDetailsFormat(), {
      filename: fileName,
      language: languageIcon.text,
      workspace: repoName ?? workspaceName,
    })

    if (issueText) {
      details = `${details} ${issueText}`
    }

    const state = formatTemplate(this.config.getStateFormat(), {
      filename: fileName,
      language: languageIcon.text,
      workspace: workspaceName,
    })

    const showSmallImage = this.config.shouldShowLanguage() && this.config.shouldShowFileIcon()

    const presence: Activity = {
      details: this.config.shouldShowFileName() ? details : "Editing a file",
      state: this.config.shouldShowWorkspace() ? state : "Working in VS Code",
      startTimestamp: this.config.shouldShowElapsedTime() ? this.startTimestamp : undefined,
      largeImageText: this.config.getLargeImageText(),
      smallImageKey: showSmallImage ? languageIcon.key : undefined,
      smallImageText: showSmallImage ? languageIcon.text : undefined,
    }

    if (githubUrl) {
      presence.buttons = [
        {
          label: "View Repository",
          url: githubUrl,
        },
      ]
    }

    await this.discordClient.setActivity(presence)
  }

  /**
   * Get the current workspace name
   */
  private getWorkspaceName(): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    return workspaceFolder?.name || "No workspace"
  }
}
