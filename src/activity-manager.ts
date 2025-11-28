/**
 * Activity Manager
 * Tracks VS Code activity and updates Discord presence
 */

import * as vscode from "vscode"
import type { DiscordClient } from "./discord-client"
import { type ConfigManager, LANGUAGE_ICONS } from "./config"

/**
 * Manages VS Code activity tracking and Discord presence updates
 */
export class ActivityManager {
  private startTimestamp: number
  private lastActivityTime: number
  private active = false
  private idleCheckInterval: NodeJS.Timeout | undefined
  private currentEditor: vscode.TextEditor | undefined
  private disposables: vscode.Disposable[] = []

  constructor(
    private discordClient: DiscordClient,
    private config: ConfigManager,
  ) {
    this.startTimestamp = Date.now()
    this.lastActivityTime = Date.now()
  }

  /**
   * Start tracking VS Code activity
   * Registers event listeners for editor changes
   */
  start(): void {
    if (this.active) {
      return
    }

    this.active = true
    this.startTimestamp = Date.now()
    this.lastActivityTime = Date.now()

    // Track active text editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this.handleEditorChange(editor)
      }),
    )

    // Track text document changes (typing)
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(() => {
        this.handleActivity()
      }),
    )

    // Track when editor gets focus
    this.disposables.push(
      vscode.window.onDidChangeWindowState((state) => {
        if (state.focused) {
          this.handleActivity()
        }
      }),
    )

    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics(() => {
        this.updatePresence()
      }),
    )

    // Check for idle state every 30 seconds
    this.idleCheckInterval = setInterval(() => {
      this.checkIdleState()
    }, 30000)

    // Set initial presence based on current editor
    this.currentEditor = vscode.window.activeTextEditor
    this.updatePresence()
  }

  /**
   * Stop tracking activity and clear presence
   */
  stop(): void {
    if (!this.active) {
      return
    }

    this.active = false

    // Clear all event listeners
    this.disposables.forEach((d) => d.dispose())
    this.disposables = []

    // Clear idle check interval
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval)
      this.idleCheckInterval = undefined
    }

    // Clear Discord presence
    this.discordClient.clearActivity()
  }

  /**
   * Refresh presence with current settings
   * Useful when configuration changes
   */
  refresh(): void {
    if (this.active) {
      this.updatePresence()
    }
  }

  /**
   * Handle editor change event
   * @param editor - New active editor
   */
  private handleEditorChange(editor: vscode.TextEditor | undefined): void {
    this.currentEditor = editor
    this.handleActivity()
  }

  /**
   * Handle any activity (typing, switching files, etc.)
   * Updates last activity time and presence
   */
  private handleActivity(): void {
    this.lastActivityTime = Date.now()
    this.updatePresence()
  }

  /**
   * Check if user has been idle for too long
   * Changes presence to "Idle" state if inactive
   */
  private checkIdleState(): void {
    const idleTimeout = this.config.getIdleTimeout()
    const timeSinceActivity = Date.now() - this.lastActivityTime

    if (timeSinceActivity > idleTimeout) {
      // User is idle - update presence to show idle state
      this.discordClient.setActivity({
        details: "Idle",
        state: "Away from keyboard",
        startTimestamp: this.startTimestamp,
      })
    }
  }

  /**
   * Get GitHub repository URL from Git configuration
   * @returns GitHub repository URL or undefined if not found
   */
  private async getGitHubRepoUrl(): Promise<string | undefined> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
      if (!workspaceFolder) {
        return undefined
      }

      // Get Git extension
      const gitExtension = vscode.extensions.getExtension("vscode.git")
      if (!gitExtension) {
        return undefined
      }

      const git = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate()
      const api = git.getAPI(1)

      if (api.repositories.length === 0) {
        return undefined
      }

      const repository = api.repositories[0]
      const remotes = repository.state.remotes

      // Look for origin or any GitHub remote
      for (const remote of remotes) {
        const url = remote.fetchUrl || remote.pushUrl
        if (url && url.includes("github.com")) {
          // Convert SSH URL to HTTPS URL
          let httpsUrl = url
          if (url.startsWith("git@github.com:")) {
            httpsUrl = url.replace("git@github.com:", "https://github.com/")
          }
          // Remove .git suffix
          httpsUrl = httpsUrl.replace(/\.git$/, "")
          return httpsUrl
        }
      }

      return undefined
    } catch (error) {
      // Silently fail if Git is not available
      return undefined
    }
  }

  /**
   * Get issue count for current file
   * @returns Object with error and warning counts
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
   * Update Discord presence based on current activity
   * Formats and sends presence data to Discord
   */
  private async updatePresence(): Promise<void> {
    if (!this.active || !this.discordClient.isConnected()) {
      return
    }

    const editor = this.currentEditor

    // Gather information about current activity
    const fileName = editor?.document.fileName ? this.getFileName(editor.document.fileName) : "No file open"
    const languageId = editor?.document.languageId || "text"
    const workspaceName = this.getWorkspaceName()

    const githubUrl = this.config.shouldShowGitHubRepo() ? await this.getGitHubRepoUrl() : undefined
    const repoName = githubUrl ? this.extractRepoName(githubUrl) : undefined

    const issues = this.config.shouldShowIssues() ? this.getIssueCount() : { errors: 0, warnings: 0 }
    const issueText = this.formatIssueText(issues)

    // Format details and state text using configuration
    let details = this.formatText(this.config.getDetailsFormat(), fileName, languageId, repoName || workspaceName)

    if (issueText && this.config.shouldShowIssues()) {
      details = `${details} ${issueText}`
    }

    let state = this.formatText(this.config.getStateFormat(), fileName, languageId, workspaceName)

    if (repoName && this.config.shouldShowGitHubRepo()) {
      state = `📦 ${repoName}`
    }

    // Get language-specific icon if available
    const languageIcon = this.getLanguageIcon(languageId)

    const presenceData: any = {
      details: this.config.shouldShowFileName() ? details : "Editing a file",
      state: this.config.shouldShowWorkspace() ? state : "Working in VS Code",
      startTimestamp: this.config.shouldShowElapsedTime() ? this.startTimestamp : undefined,
      smallImageKey: languageIcon.key,
      smallImageText: languageIcon.text,
    }

    if (githubUrl) {
      presenceData.buttons = [
        {
          label: "View Repository",
          url: githubUrl,
        },
      ]
    }

    // Update Discord presence
    await this.discordClient.setActivity(presenceData)
  }

  /**
   * Extract repository name from GitHub URL
   * @param url - GitHub repository URL
   * @returns Repository name in format "owner/repo"
   */
  private extractRepoName(url: string): string {
    try {
      const match = url.match(/github\.com[/:]([\w-]+\/[\w-]+)/)
      return match ? match[1] : "GitHub Repository"
    } catch (error) {
      return "GitHub Repository"
    }
  }

  /**
   * Format issue count into readable text
   * @param issues - Object with error and warning counts
   * @returns Formatted issue text or empty string
   */
  private formatIssueText(issues: { errors: number; warnings: number }): string {
    const parts: string[] = []

    if (issues.errors > 0) {
      parts.push(`${issues.errors} ❌`)
    }

    if (issues.warnings > 0) {
      parts.push(`${issues.warnings} ⚠️`)
    }

    return parts.length > 0 ? `(${parts.join(", ")})` : ""
  }

  /**
   * Get file name from full file path
   * @param filePath - Full path to file
   * @returns File name without path
   */
  private getFileName(filePath: string): string {
    const parts = filePath.split(/[\\/]/)
    return parts[parts.length - 1] || "Unknown file"
  }

  /**
   * Get current workspace name
   * @returns Workspace folder name or default text
   */
  private getWorkspaceName(): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    return workspaceFolder?.name || "No workspace"
  }

  /**
   * Format text string with variable substitution
   * @param format - Format string with variables
   * @param fileName - Current file name
   * @param language - Programming language
   * @param workspace - Workspace name
   * @returns Formatted string
   */
  private formatText(format: string, fileName: string, language: string, workspace: string): string {
    return format.replace("{filename}", fileName).replace("{language}", language).replace("{workspace}", workspace)
  }

  /**
   * Get icon information for programming language
   * @param languageId - VS Code language identifier
   * @returns Icon key and text
   */
  private getLanguageIcon(languageId: string): { key?: string; text: string } {
    const icon = LANGUAGE_ICONS[languageId]

    if (icon) {
      return {
        key: icon.key,
        text: icon.name,
      }
    }

    return {
      key: "text",
      text: languageId.charAt(0).toUpperCase() + languageId.slice(1),
    }
  }

  /**
   * Check if activity tracking is active
   */
  isActive(): boolean {
    return this.active
  }
}
