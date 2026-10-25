/**
 * Discord RPC Client Manager
 * Handles connection and communication with the Discord client
 *
 * @author Extrise
 * @license MIT
 */

import * as DiscordRPC from "discord-rpc"
import { CLIENT_ID, LARGE_IMAGE_KEY, LARGE_IMAGE_TEXT } from "./constants.js"
import { truncateDiscordText } from "./util.js"

const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30000

/**
 * Manages the Discord RPC connection and presence updates
 */
export class DiscordClient {
  /**
   * The RPC client for the current connection.
   *
   * discord-rpc 4.0.1 memoizes its internal connect promise and never resets
   * it after the transport closes, so a reused client can never log in again
   * (it either returns the settled promise or resolves without connecting).
   * A fresh client instance is therefore created for every connection attempt.
   */
  private client: DiscordRPC.Client | undefined
  private connected = false
  /** Promise for the login currently in flight, if any. */
  private connecting: Promise<void> | undefined
  private reconnectAttempts = 0
  /** Set while a disconnect was requested by the user; auto-reconnect then stays off. */
  private manualDisconnect = false
  private reconnectTimer: NodeJS.Timeout | undefined
  private readyCallback: (() => void) | undefined
  private disconnectedCallback: (() => void) | undefined
  private errorCallback: ((error: unknown) => void) | undefined

  /**
   * Create a fresh RPC client with its event handlers attached.
   * Handlers only act on unexpected disconnects; intentional disconnects
   * (manual disconnect, client replacement) must set `manualDisconnect` first.
   */
  private createClient(): DiscordRPC.Client {
    const client = new DiscordRPC.Client({ transport: "ipc" })

    client.on("ready", () => {
      this.connected = true
      this.reconnectAttempts = 0
      this.readyCallback?.()
    })

    client.on("disconnected", () => {
      if (this.manualDisconnect) {
        return
      }

      this.connected = false
      this.disconnectedCallback?.()
      this.scheduleReconnect()
    })

    return client
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
   * Concurrent calls share the same login attempt.
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    if (this.connecting) {
      return this.connecting
    }

    this.connecting = this.performConnect().finally(() => {
      this.connecting = undefined
    })

    return this.connecting
  }

  /**
   * Run one connection attempt with a fresh RPC client
   */
  private async performConnect(): Promise<void> {
    // Suppress late "disconnected" events from the client being discarded
    this.manualDisconnect = true
    await this.destroyCurrentClient()

    const client = this.createClient()
    this.client = client

    try {
      await client.login({ clientId: CLIENT_ID })
    } catch (error) {
      // Restore auto-reconnect behavior, then discard the half-open client so
      // its late events cannot corrupt the next attempt's state
      this.manualDisconnect = false
      await this.destroyCurrentClient()
      throw error
    }

    this.manualDisconnect = false
    this.connected = true
    this.reconnectAttempts = 0
  }

  /**
   * Disconnect from Discord
   */
  async disconnect(): Promise<void> {
    this.manualDisconnect = true
    this.cancelReconnect()

    if (this.connecting) {
      // Wait for the in-flight login so it cannot resurrect the connection
      // after the disconnect completes
      await this.connecting.catch(() => undefined)
    }

    this.connected = false
    await this.destroyCurrentClient()
  }

  /**
   * Update Discord Rich Presence with activity data
   */
  async setActivity(activity: DiscordRPC.Activity): Promise<void> {
    const client = this.client

    if (!this.connected || !client) {
      return
    }

    const payload: DiscordRPC.Activity = {
      // Discord rejects text fields longer than 128 characters
      details: truncateDiscordText(activity.details ?? "Coding in VS Code"),
      state: truncateDiscordText(activity.state ?? "Working on a project"),
      startTimestamp: activity.startTimestamp,
      largeImageKey: activity.largeImageKey ?? LARGE_IMAGE_KEY,
      largeImageText: truncateDiscordText(activity.largeImageText ?? LARGE_IMAGE_TEXT),
      smallImageKey: activity.smallImageKey,
      smallImageText: truncateDiscordText(activity.smallImageText),
      buttons: activity.buttons,
      instance: false,
    }

    try {
      await client.setActivity(payload)
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
    const client = this.client

    if (!this.connected || !client) {
      return
    }

    try {
      await client.clearActivity()
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

  /**
   * Discard the current RPC client, if any. Errors are swallowed because the
   * transport may already be gone; a fresh client is created for the next
   * connection attempt either way.
   */
  private async destroyCurrentClient(): Promise<void> {
    const client = this.client
    this.client = undefined

    if (!client) {
      return
    }

    try {
      await client.destroy()
    } catch {
      // Discord may already be gone; there is nothing left to clean up
    }
  }
}
