/**
 * Type definitions for discord-rpc
 * This file provides TypeScript type definitions for the discord-rpc module
 * since it doesn't include its own type definitions
 */

declare module "discord-rpc" {
  import { EventEmitter } from "events"

  /**
   * Discord RPC Client class
   * Handles connection and communication with Discord client
   */
  export class Client extends EventEmitter {
    constructor(options: { transport: string })

    /**
     * Login to Discord RPC
     * @param options - Login options containing clientId
     */
    login(options: { clientId: string }): Promise<void>

    /**
     * Set the activity/rich presence
     * @param activity - Activity configuration object
     * @param pid - Process ID (optional)
     */
    setActivity(activity: Activity, pid?: number): Promise<Activity>

    /**
     * Clear the current activity
     * @param pid - Process ID (optional)
     */
    clearActivity(pid?: number): Promise<void>

    /**
     * Destroy the RPC connection
     */
    destroy(): Promise<void>

    /**
     * Current user information
     */
    user?: {
      id: string
      username: string
      discriminator: string
      avatar: string
    }
  }

  /**
   * Activity configuration for Discord Rich Presence
   */
  export interface Activity {
    details?: string
    state?: string
    startTimestamp?: number
    endTimestamp?: number
    largeImageKey?: string
    largeImageText?: string
    smallImageKey?: string
    smallImageText?: string
    partyId?: string
    partySize?: number
    partyMax?: number
    matchSecret?: string
    joinSecret?: string
    spectateSecret?: string
    buttons?: Array<{
      label: string
      url: string
    }>
    instance?: boolean
  }

  /**
   * Register a protocol for Discord RPC
   * @param id - Application/Client ID
   */
  export function register(id: string): void
}
