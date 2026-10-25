/**
 * Configuration Manager
 * Handles extension settings
 *
 * @author Extrise
 * @license MIT
 */

import * as vscode from "vscode"
import { normalizeNumber } from "./util.js"

const DEFAULT_IDLE_TIMEOUT_MINUTES = 0
const DEFAULT_RECONNECT_INTERVAL_MS = 5000
const DEFAULT_UPDATE_INTERVAL_MS = 15000
const MIN_INTERVAL_MS = 1000

/**
 * Provides typed, validated access to the extension settings
 */
export class ConfigManager {
  private config: vscode.WorkspaceConfiguration

  constructor() {
    this.config = vscode.workspace.getConfiguration("statuscode")
  }

  /**
   * Re-read the configuration (useful after settings change)
   */
  reload(): void {
    this.config = vscode.workspace.getConfiguration("statuscode")
  }

  /**
   * Check if rich presence is enabled
   */
  isEnabled(): boolean {
    return this.config.get<boolean>("enabled", true)
  }

  /**
   * Set enabled state
   */
  async setEnabled(enabled: boolean): Promise<void> {
    await this.config.update("enabled", enabled, vscode.ConfigurationTarget.Global)
    this.reload()
  }

  /**
   * Check if file name should be shown
   */
  shouldShowFileName(): boolean {
    return this.config.get<boolean>("showFileName", true)
  }

  /**
   * Check if workspace name should be shown
   */
  shouldShowWorkspace(): boolean {
    return this.config.get<boolean>("showWorkspace", true)
  }

  /**
   * Check if programming language icon should be shown
   */
  shouldShowLanguage(): boolean {
    return this.config.get<boolean>("showLanguage", true)
  }

  /**
   * Check if file type icon should be shown
   */
  shouldShowFileIcon(): boolean {
    return this.config.get<boolean>("showFileIcon", true)
  }

  /**
   * Check if elapsed time should be shown
   */
  shouldShowElapsedTime(): boolean {
    return this.config.get<boolean>("showElapsedTime", true)
  }

  /**
   * Check if GitHub repository URL should be shown
   */
  shouldShowGitHubRepo(): boolean {
    return this.config.get<boolean>("showGitHubRepo", true)
  }

  /**
   * Check if issue/problem count should be shown
   */
  shouldShowIssues(): boolean {
    return this.config.get<boolean>("showIssues", true)
  }

  /**
   * Get details format string
   */
  getDetailsFormat(): string {
    return this.config.get<string>("details", "Coding in Visual Studio Code")
  }

  /**
   * Get state format string
   */
  getStateFormat(): string {
    return this.config.get<string>("state", "Editing {filename}")
  }

  /**
   * Get large image hover text
   */
  getLargeImageText(): string {
    return this.config.get<string>("largeImageText", "Visual Studio Code")
  }

  /**
   * Get idle timeout in milliseconds (0 = disabled)
   */
  getIdleTimeout(): number {
    const minutes = normalizeNumber(this.config.get<number>("idleTimeout"), DEFAULT_IDLE_TIMEOUT_MINUTES, 0)
    return minutes * 60 * 1000
  }

  /**
   * Get Discord reconnection interval in milliseconds (minimum 1s)
   */
  getReconnectInterval(): number {
    return normalizeNumber(this.config.get<number>("reconnectInterval"), DEFAULT_RECONNECT_INTERVAL_MS, MIN_INTERVAL_MS)
  }

  /**
   * Get activity update interval in milliseconds (minimum 1s)
   */
  getUpdateInterval(): number {
    return normalizeNumber(this.config.get<number>("updateInterval"), DEFAULT_UPDATE_INTERVAL_MS, MIN_INTERVAL_MS)
  }
}
