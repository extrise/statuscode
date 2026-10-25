/**
 * Pure helpers shared by the extension runtime and its unit tests.
 * Must stay free of VS Code imports.
 *
 * @author Extrise
 * @license MIT
 */

import { LANGUAGE_ICONS } from "./constants.js"

/** Variables available inside the {filename}, {language} and {workspace} templates. */
export interface TemplateVariables {
  filename: string
  language: string
  workspace: string
}

/** Discord small image information for a language. */
export interface LanguageIcon {
  key?: string
  text: string
}

/**
 * Substitute template variables in a user configured format string.
 * All occurrences of each variable are replaced.
 */
export function formatTemplate(format: string, variables: TemplateVariables): string {
  return format
    .replaceAll("{filename}", variables.filename)
    .replaceAll("{language}", variables.language)
    .replaceAll("{workspace}", variables.workspace)
}

/**
 * Extract the file name from a full path (POSIX or Windows style).
 */
export function getFileName(filePath: string): string {
  const parts = filePath.split(/[\\/]/)
  return parts[parts.length - 1] || "Unknown file"
}

/**
 * Extract the "owner/repo" name from a GitHub URL, with a readable fallback.
 * A trailing ".git" suffix is dropped so it never shows in the presence.
 */
export function extractRepoName(url: string): string {
  const match = url.match(/github\.com[/:]([\w.-]+\/[\w.-]+)/)
  return match ? match[1].replace(/\.git$/i, "") : "GitHub Repository"
}

/**
 * Convert a GitHub remote URL (HTTPS, SSH, git:// or http:// form) into an
 * HTTPS URL without the .git suffix, suitable for a clickable Discord button.
 */
export function toGitHubHttpsUrl(url: string): string {
  let httpsUrl = url

  if (url.startsWith("git@github.com:")) {
    httpsUrl = `https://github.com/${url.slice("git@github.com:".length)}`
  } else if (url.startsWith("ssh://git@github.com/")) {
    httpsUrl = `https://github.com/${url.slice("ssh://git@github.com/".length)}`
  } else {
    httpsUrl = httpsUrl.replace(/^git:\/\/github\.com\//i, "https://github.com/")
    httpsUrl = httpsUrl.replace(/^http:\/\/github\.com\//i, "https://github.com/")
  }

  return httpsUrl.replace(/\.git$/i, "").replace(/\/+$/, "")
}

/**
 * Format an error/warning count into a short readable suffix, or "" when clean.
 */
export function formatIssueText(issues: { errors: number; warnings: number }): string {
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
 * Resolve the Discord small image information for a language ID.
 * Unknown languages fall back to the generic text icon with a capitalized label.
 */
export function getLanguageIcon(languageId: string): LanguageIcon {
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
 * Discord rejects rich presence text fields longer than this many characters.
 */
export const DISCORD_TEXT_LIMIT = 128

/**
 * Trim a rich presence text field to Discord's length limit, or pass it
 * through untouched. `undefined` stays `undefined`.
 */
export function truncateDiscordText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value.length <= DISCORD_TEXT_LIMIT) {
    return value
  }

  return `${value.slice(0, DISCORD_TEXT_LIMIT - 1)}…`
}

/**
 * Coerce a numeric setting: fall back when missing/NaN, clamp to a minimum.
 */
export function normalizeNumber(value: number | undefined, fallback: number, minimum: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback
  }

  return Math.max(minimum, value)
}
