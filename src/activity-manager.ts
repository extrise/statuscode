/**
 * Activity Manager
 * Tracks VS Code activity and updates Discord presence
 */

import * as vscode from "vscode";
import type { DiscordClient } from "./discord-client";
import { type ConfigManager, LANGUAGE_ICONS } from "./config";

/**
 * Manages VS Code activity tracking and Discord presence updates
 */
export class ActivityManager {
  private startTimestamp: number;
  private lastActivityTime: number;
  private active = false;
  private idleCheckInterval: NodeJS.Timeout | undefined;
  private currentEditor: vscode.TextEditor | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private discordClient: DiscordClient,
    private config: ConfigManager,
  ) {
    this.startTimestamp = Date.now();
    this.lastActivityTime = Date.now();
  }

  /**
   * Start tracking VS Code activity
   * Registers event listeners for editor changes
   */
  start(): void {
    if (this.active) {
      return;
    }

    this.active = true;
    this.startTimestamp = Date.now();
    this.lastActivityTime = Date.now();

    // Track active text editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this.handleEditorChange(editor);
      }),
    );

    // Track text document changes (typing)
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(() => {
        this.handleActivity();
      }),
    );

    // Track when editor gets focus
    this.disposables.push(
      vscode.window.onDidChangeWindowState((state) => {
        if (state.focused) {
          this.handleActivity();
        }
      }),
    );

    // Check for idle state every 30 seconds
    this.idleCheckInterval = setInterval(() => {
      this.checkIdleState();
    }, 30000);

    // Set initial presence based on current editor
    this.currentEditor = vscode.window.activeTextEditor;
    this.updatePresence();
  }

  /**
   * Stop tracking activity and clear presence
   */
  stop(): void {
    if (!this.active) {
      return;
    }

    this.active = false;

    // Clear all event listeners
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];

    // Clear idle check interval
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = undefined;
    }

    // Clear Discord presence
    this.discordClient.clearActivity();
  }

  /**
   * Refresh presence with current settings
   * Useful when configuration changes
   */
  refresh(): void {
    if (this.active) {
      this.updatePresence();
    }
  }

  /**
   * Handle editor change event
   * @param editor - New active editor
   */
  private handleEditorChange(editor: vscode.TextEditor | undefined): void {
    this.currentEditor = editor;
    this.handleActivity();
  }

  /**
   * Handle any activity (typing, switching files, etc.)
   * Updates last activity time and presence
   */
  private handleActivity(): void {
    this.lastActivityTime = Date.now();
    this.updatePresence();
  }

  /**
   * Check if user has been idle for too long
   * Changes presence to "Idle" state if inactive
   */
  private checkIdleState(): void {
    const idleTimeout = this.config.getIdleTimeout();
    const timeSinceActivity = Date.now() - this.lastActivityTime;

    if (timeSinceActivity > idleTimeout) {
      // User is idle - update presence to show idle state
      this.discordClient.setActivity({
        details: "Idle",
        state: "Away from keyboard",
        startTimestamp: this.startTimestamp,
      });
    }
  }

  /**
   * Update Discord presence based on current activity
   * Formats and sends presence data to Discord
   */
  private async updatePresence(): Promise<void> {
    if (!this.active || !this.discordClient.isConnected()) {
      return;
    }

    const editor = this.currentEditor;

    // Gather information about current activity
    const fileName = editor?.document.fileName ? this.getFileName(editor.document.fileName) : "No file open";

    const languageId = editor?.document.languageId || "text";
    const workspaceName = this.getWorkspaceName();

    // Format details and state text using configuration
    const details = this.formatText(this.config.getDetailsFormat(), fileName, languageId, workspaceName);

    const state = this.formatText(this.config.getStateFormat(), fileName, languageId, workspaceName);

    // Get language-specific icon if available
    const languageIcon = this.getLanguageIcon(languageId);

    // Build presence data
    const presenceData = {
      details: this.config.shouldShowFileName() ? details : "Editing a file",
      state: this.config.shouldShowWorkspace() ? state : "Working in VS Code",
      startTimestamp: this.config.shouldShowElapsedTime() ? this.startTimestamp : undefined,
      smallImageKey: languageIcon.key,
      smallImageText: languageIcon.text,
    };

    // Update Discord presence
    await this.discordClient.setActivity(presenceData);
  }

  /**
   * Get file name from full file path
   * @param filePath - Full path to file
   * @returns File name without path
   */
  private getFileName(filePath: string): string {
    const parts = filePath.split(/[\\/]/);
    return parts[parts.length - 1] || "Unknown file";
  }

  /**
   * Get current workspace name
   * @returns Workspace folder name or default text
   */
  private getWorkspaceName(): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    return workspaceFolder?.name || "No workspace";
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
    return format.replace("{filename}", fileName).replace("{language}", language).replace("{workspace}", workspace);
  }

  /**
   * Get icon information for programming language
   * @param languageId - VS Code language identifier
   * @returns Icon key and text
   */
  private getLanguageIcon(languageId: string): { key?: string; text: string } {
    const icon = LANGUAGE_ICONS[languageId];

    if (icon) {
      return {
        key: icon.key,
        text: icon.name,
      };
    }

    return {
      text: languageId.charAt(0).toUpperCase() + languageId.slice(1),
    };
  }

  /**
   * Check if activity tracking is active
   */
  isActive(): boolean {
    return this.active;
  }
}
