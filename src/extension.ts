/**
 * StatusCode - Discord Rich Presence for VS Code
 * Main extension entry point
 *
 * @author Extrise
 * @license MIT
 */

import * as vscode from "vscode"
import { ActivityManager } from "./activity-manager.js"
import { ConfigManager } from "./config.js"
import { DiscordClient } from "./discord-client.js"

/** Status bar position priority. */
const STATUS_BAR_PRIORITY = 100
/** Delay before the first automatic connection so Discord has time to load. */
const STARTUP_DELAY_MS = 3000

let config: ConfigManager | undefined
let discordClient: DiscordClient | undefined
let activityManager: ActivityManager | undefined
let statusBarItem: vscode.StatusBarItem | undefined
let outputChannel: vscode.OutputChannel | undefined
let startupTimer: NodeJS.Timeout | undefined
let retryTimer: NodeJS.Timeout | undefined

/**
 * Append a message (and optional error) to the "StatusCode" output channel
 */
function log(message: string, error?: unknown): void {
  if (!outputChannel) {
    return
  }

  outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`)

  if (error !== undefined) {
    outputChannel.appendLine(error instanceof Error ? (error.stack ?? error.message) : String(error))
  }
}

/**
 * Update the status bar item with the current connection status
 */
function updateStatusBar(status: string, icon: string): void {
  if (!statusBarItem) {
    return
  }

  statusBarItem.text = `${icon} StatusCode`
  statusBarItem.tooltip = `Discord Rich Presence: ${status}`
  statusBarItem.show()
}

/**
 * Stop the background retry loop, if running
 */
function stopRetryLoop(): void {
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = undefined
  }
}

/**
 * Clear all pending automatic start timers
 */
function clearTimers(): void {
  if (startupTimer) {
    clearTimeout(startupTimer)
    startupTimer = undefined
  }

  stopRetryLoop()
}

/**
 * Start Discord Rich Presence: connects to Discord and begins activity tracking
 */
async function startPresence(): Promise<void> {
  if (!discordClient || !activityManager || !config) {
    throw new Error("StatusCode is not initialized yet")
  }

  // Already up and running - nothing to do
  if (discordClient.isConnected() && activityManager.isActive()) {
    return
  }

  updateStatusBar("Connecting...", "$(sync~spin)")

  await discordClient.connect()
  activityManager.start()
  updateStatusBar("Connected", "$(check)")

  stopRetryLoop()
}

/**
 * Stop Discord Rich Presence and clear the Discord presence
 */
async function stopPresence(): Promise<void> {
  if (activityManager) {
    activityManager.stop()
  }

  const client = discordClient

  if (client) {
    await client.disconnect()
  }

  updateStatusBar("Disabled", "$(x)")
}

/**
 * Retry the connection in the background until it succeeds or presence is disabled
 */
function startRetryLoop(): void {
  if (retryTimer || !config) {
    return
  }

  const interval = config.getReconnectInterval()

  retryTimer = setInterval(() => {
    if (!config?.isEnabled()) {
      stopRetryLoop()
      updateStatusBar("Disabled", "$(x)")
      return
    }

    void startPresence().catch((error) => {
      log("Failed to connect to Discord, retrying...", error)
      updateStatusBar("Retrying…", "$(sync~spin)")
    })
  }, interval)
}

/**
 * Schedule the first automatic connection after VS Code startup
 */
function scheduleAutoStart(): void {
  stopRetryLoop()

  startupTimer = setTimeout(() => {
    startupTimer = undefined
    void startPresence().catch((error) => {
      log("Initial connection to Discord failed, retrying in the background...", error)
      updateStatusBar("Retrying…", "$(sync~spin)")
      startRetryLoop()
    })
  }, STARTUP_DELAY_MS)
}

/**
 * React to configuration changes: start, stop or refresh the presence
 */
async function handleConfigurationChange(): Promise<void> {
  if (!config) {
    return
  }

  config.reload()

  const enabled = config.isEnabled()
  const active = Boolean(activityManager?.isActive())

  if (enabled && !active) {
    try {
      await startPresence()
    } catch (error) {
      log("Failed to connect after configuration change, retrying in the background...", error)
      updateStatusBar("Retrying…", "$(sync~spin)")
      startRetryLoop()
    }
    return
  }

  if (!enabled && active) {
    stopRetryLoop()
    await stopPresence()
    return
  }

  if (enabled && active) {
    // A changed reconnect interval must restart the retry loop to take effect
    stopRetryLoop()
    if (!discordClient?.isConnected()) {
      startRetryLoop()
    }
    activityManager?.refresh()
  }
}

/**
 * Called when the extension is activated.
 * This happens on VS Code startup (onStartupFinished).
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    config = new ConfigManager()

    outputChannel = vscode.window.createOutputChannel("StatusCode")
    context.subscriptions.push(outputChannel)

    // Create the Discord RPC client and the activity tracker
    discordClient = new DiscordClient()
    activityManager = new ActivityManager(discordClient, config)

    // Create the status bar item to show the connection status
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, STATUS_BAR_PRIORITY)
    statusBarItem.name = "StatusCode"
    statusBarItem.text = "$(radio-tower) StatusCode"
    statusBarItem.tooltip = "Discord Rich Presence - Click to reconnect"
    statusBarItem.command = "statuscode.reconnect"
    context.subscriptions.push(statusBarItem)

    // Register command: Enable presence
    context.subscriptions.push(
      vscode.commands.registerCommand("statuscode.enable", async () => {
        try {
          await config?.setEnabled(true)
          await startPresence()
          vscode.window.showInformationMessage("StatusCode: Discord presence enabled")
        } catch (error) {
          log("Failed to enable Rich Presence", error)
          vscode.window.showErrorMessage("StatusCode: Failed to enable Rich Presence")
        }
      }),
    )

    // Register command: Disable presence
    context.subscriptions.push(
      vscode.commands.registerCommand("statuscode.disable", async () => {
        try {
          await config?.setEnabled(false)
          clearTimers()
          await stopPresence()
          vscode.window.showInformationMessage("StatusCode: Discord presence disabled")
        } catch (error) {
          log("Failed to disable Rich Presence", error)
          vscode.window.showErrorMessage("StatusCode: Failed to disable Rich Presence")
        }
      }),
    )

    // Register command: Reconnect to Discord
    context.subscriptions.push(
      vscode.commands.registerCommand("statuscode.reconnect", async () => {
        try {
          await stopPresence()
          await startPresence()
          vscode.window.showInformationMessage("StatusCode: Reconnected to Discord")
        } catch (error) {
          log("Failed to reconnect to Discord", error)
          vscode.window.showErrorMessage("StatusCode: Failed to reconnect to Discord")
        }
      }),
    )

    discordClient.onReady(() => {
      updateStatusBar("Connected", "$(check)")
      // Push the current activity now that Discord is reachable
      activityManager?.refresh()
    })
    discordClient.onDisconnected(() => updateStatusBar("Disconnected", "$(x)"))
    discordClient.onError((error) => log("Discord RPC error", error))

    // Watch for configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("statuscode")) {
          void handleConfigurationChange()
        }
      }),
    )

    // Automatic startup with background retry until Discord is reachable
    if (config.isEnabled()) {
      scheduleAutoStart()
    } else {
      updateStatusBar("Disabled", "$(x)")
    }
  } catch (error) {
    log("Failed to activate extension", error)
    vscode.window.showErrorMessage("StatusCode: Failed to activate extension")
  }
}

/**
 * Called when the extension is deactivated.
 * Cleans up timers and disconnects from Discord.
 */
export async function deactivate(): Promise<void> {
  clearTimers()
  await stopPresence()
}
