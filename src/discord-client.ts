/**
 * Discord RPC Client Manager
 * Handles connection and communication with Discord client
 */

import * as DiscordRPC from "discord-rpc"
import { CLIENT_ID, LARGE_IMAGE_KEY, LARGE_IMAGE_TEXT } from "./config"

interface PresenceData {
  details?: string
  state?: string
  startTimestamp?: number
  largeImageKey?: string
  largeImageText?: string
  smallImageKey?: string
  smallImageText?: string
  buttons?: Array<{ label: string; url: string }>
  instance?: boolean
}

/**
 * Manages Discord RPC connection and presence updates
 */
export class DiscordClient {
  private client: DiscordRPC.Client | undefined
  private connected = false
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts: number = 5
  private reconnectTimer: NodeJS.Timeout | undefined
  private onReadyCallback: (() => void) | undefined
  private onDisconnectedCallback: (() => void) | undefined

  constructor() {
    try {
      this.client = new DiscordRPC.Client({ transport: "ipc" })
      this.setupEventHandlers()
    } catch (error) {
      throw error
    }
  }

  /**
   * Setup event handlers for Discord client
   */
  private setupEventHandlers(): void {
    if (!this.client) {
      return
    }

    // Handle successful connection
    this.client.on("ready", () => {
      this.connected = true
      this.reconnectAttempts = 0
      if (this.onReadyCallback) {
        this.onReadyCallback()
      }
    })

    // Handle disconnection
    this.client.on("disconnected", () => {
      this.connected = false
      if (this.onDisconnectedCallback) {
        this.onDisconnectedCallback()
      }
      this.handleDisconnect()
    })
  }

  /**
   * Register callback for when Discord client is ready
   */
  onReady(callback: () => void): void {
    this.onReadyCallback = callback
  }

  /**
   * Register callback for when Discord client is disconnected
   */
  onDisconnected(callback: () => void): void {
    this.onDisconnectedCallback = callback
  }

  /**
   * Connect to Discord client running on user's machine
   * Uses IPC (Inter-Process Communication) - no authentication needed
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    if (!this.client) {
      throw new Error("Discord RPC client not initialized")
    }

    try {
      // Login to Discord RPC with application client ID
      await this.client.login({ clientId: CLIENT_ID })
    } catch (error) {
      throw error
    }
  }

  /**
   * Disconnect from Discord
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }

    if (this.client && this.connected) {
      try {
        await this.client.destroy()
        this.connected = false
      } catch (error) {
        // Silently handle disconnect errors
      }
    }
  }

  /**
   * Update Discord Rich Presence with activity data
   * @param presence - Presence data to display
   */
  async setActivity(presence: PresenceData): Promise<void> {
    if (!this.connected || !this.client) {
      return
    }

    try {
      const activityPayload: any = {
        details: presence.details || "Coding in VS Code",
        state: presence.state || "Working on a project",
        startTimestamp: presence.startTimestamp,
        largeImageKey: presence.largeImageKey || LARGE_IMAGE_KEY,
        largeImageText: presence.largeImageText || LARGE_IMAGE_TEXT,
        smallImageKey: presence.smallImageKey,
        smallImageText: presence.smallImageText,
        instance: false,
      }

      if (presence.buttons && presence.buttons.length > 0) {
        activityPayload.buttons = presence.buttons
      }

      await this.client.setActivity(activityPayload)
    } catch (error) {
      if (error instanceof Error && error.message.includes("connection")) {
        this.connected = false
      }
    }
  }

  /**
   * Clear Discord Rich Presence
   */
  async clearActivity(): Promise<void> {
    if (!this.connected || !this.client) {
      return
    }

    try {
      await this.client.clearActivity()
    } catch (error) {
      // Silently handle clear errors
    }
  }

  /**
   * Handle disconnection and attempt reconnection
   */
  private handleDisconnect(): void {
    // Prevent multiple reconnection attempts
    if (this.reconnectTimer) {
      return
    }

    // Stop reconnecting after max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    // Exponential backoff for reconnection
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined
      this.reconnectAttempts++

      try {
        await this.connect()
      } catch (error) {
        this.handleDisconnect()
      }
    }, delay)
  }

  /**
   * Check if client is connected to Discord
   */
  isConnected(): boolean {
    return this.connected
  }
}
