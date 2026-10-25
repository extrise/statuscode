/**
 * Discord RPC Client Manager
 * Handles connection and communication with the Discord client
 *
 * @author Extrise
 * @license MIT
 */

import * as DiscordRPC from "discord-rpc"
import { CLIENT_ID, LARGE_IMAGE_KEY, LARGE_IMAGE_TEXT } from "./constants.js"

const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30000

/**
 * Manages the Discord RPC connection and presence updates
 */
export class DiscordClient {
  private readonly client: DiscordRPC.Client
  private connected = false
  private reconnectAttempts = 0
  /** Set while a disconnect was requested by the user; auto-reconnect then stays off. */
  private manualDisconnect = false
  private reconnectTimer: NodeJS.Timeout | undefined
  private readyCallback: (() => void) | undefined
  private disconnectedCallback: (() => void) | undefined
  private errorCallback: ((error: unknown) => void) | undefined

  constructor() {
    this.client = new DiscordRPC.Client({ transport: "ipc" })
    this.setupEventHandlers()
  }

  /**
   * Setup event handlers for the Discord client
   */
  private setupEventHandlers(): void {
    // Handle successful connection
    this.client.on("ready", () => {
      this.connected = true
      this.reconnectAttempts = 0
      this.readyCallback?.()
    })

    // Handle disconnection (e.g. Discord was closed or restarted)
    this.client.on("disconnected", () => {
      this.connected = false
      this.disconnectedCallback?.()
      this.scheduleReconnect()
    })
  }

  /**
   * Register callback for when the Discord client is ready
   */
  onReady(callback: () => void): void {
    this.readyCallback = callback
  }

  /**
   * Register callback for when the Discord client is disconnected
   */
  onDisconnected(callback: () => void): void {
    this.disconnectedCallback = callback
  }

  /**
   * Register callback for non-connection RPC errors (e.g. rejected payloads)
   */
  onError(callback: (error: unknown) => void): void {
    this.errorCallback = callback
  }

  /**
   * Connect to the Discord client running on the user's machine.
   * Uses IPC (Inter-Process Communication) - no authentication needed.
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    this.manualDisconnect = false

    await this.client.login({ clientId: CLIENT_ID })
    this.connected = true
    this.reconnectAttempts = 0
  }

  /**
   * Disconnect from Discord
   */
  async disconnect(): Promise<void> {
    this.manualDisconnect = true
    this.cancelReconnect()
    this.connected = false

    try {
      await this.client.destroy()
    } catch {
      // Discord may already be gone; there is nothing left to clean up
    }
  }

  /**
   * Update Discord Rich Presence with activity data
   */
  async setActivity(activity: DiscordRPC.Activity): Promise<void> {
    if (!this.connected) {
      return
    }

    const payload: DiscordRPC.Activity = {
      details: activity.details ?? "Coding in VS Code",
      state: activity.state ?? "Working on a project",
      startTimestamp: activity.startTimestamp,
      largeImageKey: activity.largeImageKey ?? LARGE_IMAGE_KEY,
      largeImageText: activity.largeImageText ?? LARGE_IMAGE_TEXT,
      smallImageKey: activity.smallImageKey,
      smallImageText: activity.smallImageText,
      buttons: activity.buttons,
      instance: false,
    }

    try {
      await this.client.setActivity(payload)
    } catch (error) {
      if (this.isConnectionError(error)) {
        this.connected = false
        this.scheduleReconnect()
      } else {
        this.errorCallback?.(error)
      }
    }
  }

  /**
   * Clear Discord Rich Presence
   */
  async clearActivity(): Promise<void> {
    if (!this.connected) {
      return
    }

    try {
      await this.client.clearActivity()
    } catch (error) {
      if (this.isConnectionError(error)) {
        this.connected = false
        this.scheduleReconnect()
      } else {
        this.errorCallback?.(error)
      }
    }
  }

  /**
   * Check if the client is connected to Discord
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Detect transport level failures that warrant a reconnection
   */
  private isConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false
    }

    return /connection|disconnect|socket|closed|ECONNRESET|EPIPE/i.test(error.message)
  }

  /**
   * Schedule a reconnection with exponential backoff.
   * Gives up after MAX_RECONNECT_ATTEMPTS so the user can reconnect manually.
   */
  private scheduleReconnect(): void {
    if (this.manualDisconnect || this.reconnectTimer || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return
    }

    const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempts, MAX_RECONNECT_DELAY_MS)
    this.reconnectAttempts += 1

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      void this.connect().catch((error) => {
        this.errorCallback?.(error)
        this.scheduleReconnect()
      })
    }, delay)
  }

  /**
   * Cancel any pending reconnection attempt
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
  }
}
