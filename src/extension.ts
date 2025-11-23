/**
 * StatusCode - Discord Rich Presence for VS Code
 * Main extension entry point
 *
 * @author Extrise
 * @license MIT
 */

import * as vscode from "vscode"
import { DiscordClient } from "./discord-client"
import { ActivityManager } from "./activity-manager"
import { ConfigManager } from "./config"

// Global extension state
let discordClient: DiscordClient | undefined
let activityManager: ActivityManager | undefined
let statusBarItem: vscode.StatusBarItem | undefined
let autoStartAttempted = false

/**
 * Called when the extension is activated
 * This happens on VS Code startup (onStartupFinished)
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    // Initialize configuration manager
    const config = new ConfigManager()

    // Create status bar item to show connection status
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
    statusBarItem.text = "$(radio-tower) StatusCode"
    statusBarItem.tooltip = "Discord Rich Presence - Click to reconnect"
    statusBarItem.command = "statuscode.reconnect"
    context.subscriptions.push(statusBarItem)

    // Register command: Enable presence
    context.subscriptions.push(
      vscode.commands.registerCommand("statuscode.enable", async () => {
        try {
          await config.setEnabled(true)
          await startPresence()
          vscode.window.showInformationMessage("StatusCode: Discord Presence enabled")
        } catch (error) {
          vscode.window.showErrorMessage("StatusCode: Failed to enable Rich Presence")
        }
      }),
    )

    // Register command: Disable presence
    context.subscriptions.push(
      vscode.commands.registerCommand("statuscode.disable", async () => {
        try {
          await config.setEnabled(false)
          await stopPresence()
          vscode.window.showInformationMessage("StatusCode: Discord Presence disabled")
        } catch (error) {
          vscode.window.showErrorMessage("StatusCode: Failed to disable Rich Presence")
        }
      }),
    )

    // Register command: Reconnect to Discord
    context.subscriptions.push(
      vscode.commands.registerCommand("statuscode.reconnect", async () => {
        try {
          await reconnectPresence()
          vscode.window.showInformationMessage("StatusCode: Reconnecting to Discord...")
        } catch (error) {
          vscode.window.showErrorMessage("StatusCode: Failed to reconnect to Discord")
        }
      }),
    )

    // Initialize Discord client
    discordClient = new DiscordClient()

    // Initialize activity manager with Discord client
    activityManager = new ActivityManager(discordClient, config)

    // Watch for configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("statuscode")) {
          handleConfigurationChange()
        }
      }),
    )

    // Automatic startup with proper error handling and retry logic
    if (config.isEnabled() && !autoStartAttempted) {
      autoStartAttempted = true

      // Delay startup to ensure Discord is fully loaded
      setTimeout(async () => {
        try {
          await startPresence()
        } catch (error) {
          // Silently retry connection every 15 seconds until successful
          const retryInterval = setInterval(async () => {
            if (config.isEnabled()) {
              try {
                await startPresence()
                clearInterval(retryInterval)
              } catch (retryError) {
                // Continue retrying silently
              }
            } else {
              clearInterval(retryInterval)
            }
          }, 15000)

          context.subscriptions.push({ dispose: () => clearInterval(retryInterval) })
        }
      }, 3000)
    } else if (!config.isEnabled()) {
      updateStatusBar("Disabled", false)
    }
  } catch (error) {
    vscode.window.showErrorMessage("StatusCode: Failed to activate extension")
  }
}

/**
 * Start Discord Rich Presence
 * Connects to Discord and begins activity tracking
 */
async function startPresence(): Promise<void> {
  if (!discordClient || !activityManager) {
    throw new Error("Discord client or activity manager not initialized")
  }

  updateStatusBar("Connecting...", true)

  // Connect to Discord client running on user's machine
  await discordClient.connect()

  updateStatusBar("Connected", true)

  // Start tracking VS Code activity
  activityManager.start()
}

/**
 * Stop Discord Rich Presence
 * Disconnects from Discord and stops activity tracking
 */
async function stopPresence(): Promise<void> {
  if (activityManager) {
    activityManager.stop()
  }

  if (discordClient) {
    await discordClient.disconnect()
  }

  updateStatusBar("Disabled", false)
}

/**
 * Reconnect to Discord
 * Useful if Discord was restarted while VS Code is running
 */
async function reconnectPresence(): Promise<void> {
  await stopPresence()
  await startPresence()
}

/**
 * Handle configuration changes
 * Reloads settings and restarts presence if needed
 */
async function handleConfigurationChange(): Promise<void> {
  const config = new ConfigManager()

  if (config.isEnabled() && !activityManager?.isActive()) {
    try {
      await startPresence()
    } catch (error) {
      // Silently fail and retry
    }
  } else if (!config.isEnabled() && activityManager?.isActive()) {
    await stopPresence()
  } else if (activityManager?.isActive()) {
    // Refresh activity with new settings
    activityManager.refresh()
  }
}

/**
 * Update status bar item with current connection status
 * @param status - Status text to display
 * @param isConnected - Whether Discord is connected
 */
function updateStatusBar(status: string, isConnected: boolean): void {
  if (!statusBarItem) {
    return
  }

  const icon = isConnected ? "$(check)" : "$(x)"
  statusBarItem.text = `${icon} StatusCode`
  statusBarItem.tooltip = `Discord Rich Presence: ${status}`
  statusBarItem.show()
}

/**
 * Called when the extension is deactivated
 * Cleanup resources and disconnect from Discord
 */
export async function deactivate(): Promise<void> {
  await stopPresence()

  if (statusBarItem) {
    statusBarItem.dispose()
  }
}
