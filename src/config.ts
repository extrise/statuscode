/**
 * Configuration Manager
 * Handles extension settings and constants
 */

import * as vscode from "vscode"

// Discord Client ID is PUBLIC (not a secret) - hardcode it here
// To use your own: Create app at https://discord.com/developers/applications
// Then replace this ID with your Application ID
export const CLIENT_ID = "1442068059409092689" // Public VS Code Rich Presence Application

// Default large image (VS Code logo)
export const LARGE_IMAGE_KEY = "vscode-logo"
export const LARGE_IMAGE_TEXT = "Visual Studio Code"

/**
 * Language icons mapping
 * Maps VS Code language IDs to Discord image keys
 * Upload these images to your Discord application's Rich Presence assets
 */
export const LANGUAGE_ICONS: Record<string, { key: string; name: string }> = {
  javascript: { key: "javascript", name: "JavaScript" },
  typescript: { key: "typescript", name: "TypeScript" },
  python: { key: "python", name: "Python" },
  java: { key: "java", name: "Java" },
  csharp: { key: "csharp", name: "C#" },
  cpp: { key: "cpp", name: "C++" },
  c: { key: "c", name: "C" },
  go: { key: "go", name: "Go" },
  rust: { key: "rust", name: "Rust" },
  php: { key: "php", name: "PHP" },
  ruby: { key: "ruby", name: "Ruby" },
  html: { key: "html", name: "HTML" },
  css: { key: "css", name: "CSS" },
  json: { key: "json", name: "JSON" },
  markdown: { key: "markdown", name: "Markdown" },
  yaml: { key: "yaml", name: "YAML" },
  xml: { key: "xml", name: "XML" },
  sql: { key: "sql", name: "SQL" },
}

/**
 * Configuration Manager
 * Provides easy access to extension settings
 */
export class ConfigManager {
  private config: vscode.WorkspaceConfiguration

  constructor() {
    this.config = vscode.workspace.getConfiguration("statuscode")
  }

  /**
   * Reload configuration (useful after settings change)
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
   * Check if elapsed time should be shown
   */
  shouldShowElapsedTime(): boolean {
    return this.config.get<boolean>("showElapsedTime", true)
  }

  /**
   * Get details format string
   */
  getDetailsFormat(): string {
    return this.config.get<string>("detailsFormat", "Editing {filename}")
  }

  /**
   * Get state format string
   */
  getStateFormat(): string {
    return this.config.get<string>("stateFormat", "Working on {workspace}")
  }

  /**
   * Get idle timeout in milliseconds
   */
  getIdleTimeout(): number {
    return this.config.get<number>("idleTimeout", 300000)
  }
}
