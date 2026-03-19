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
export const LARGE_IMAGE_KEY = "vscode"
export const LARGE_IMAGE_TEXT = "Visual Studio Code"

/**
 * Language icons mapping
 * Maps VS Code language IDs to Discord image keys
 * Upload these images to your Discord application's Rich Presence assets
 *
 * Expanded language support and fixed icon keys to match Discord assets
 * Icon keys must match exactly what's uploaded to Discord Developer Portal
 */
export const LANGUAGE_ICONS: Record<string, { key: string; name: string }> = {
  // Web Development
  javascript: { key: "javascript", name: "JavaScript" },
  typescript: { key: "typescript", name: "TypeScript" },
  javascriptreact: { key: "react", name: "React (JSX)" },
  typescriptreact: { key: "react", name: "React (TSX)" },
  html: { key: "html", name: "HTML" },
  css: { key: "css", name: "CSS" },
  scss: { key: "scss", name: "SCSS" },
  sass: { key: "sass", name: "Sass" },
  less: { key: "less", name: "Less" },
  vue: { key: "vue", name: "Vue" },
  svelte: { key: "svelte", name: "Svelte" },

  // Backend & Systems
  python: { key: "python", name: "Python" },
  java: { key: "java", name: "Java" },
  csharp: { key: "csharp", name: "C#" },
  cpp: { key: "cpp", name: "C++" },
  c: { key: "c", name: "C" },
  go: { key: "go", name: "Go" },
  rust: { key: "rust", name: "Rust" },
  php: { key: "php", name: "PHP" },
  ruby: { key: "ruby", name: "Ruby" },
  swift: { key: "swift", name: "Swift" },
  kotlin: { key: "kotlin", name: "Kotlin" },
  scala: { key: "scala", name: "Scala" },
  dart: { key: "dart", name: "Dart" },

  // Scripting & Shell
  shellscript: { key: "shell", name: "Shell Script" },
  bash: { key: "shell", name: "Bash" },
  powershell: { key: "powershell", name: "PowerShell" },
  perl: { key: "perl", name: "Perl" },
  lua: { key: "lua", name: "Lua" },

  // Data & Config
  json: { key: "json", name: "JSON" },
  yaml: { key: "yaml", name: "YAML" },
  toml: { key: "toml", name: "TOML" },
  xml: { key: "xml", name: "XML" },
  sql: { key: "sql", name: "SQL" },
  graphql: { key: "graphql", name: "GraphQL" },

  // Documentation & Markup
  markdown: { key: "markdown", name: "Markdown" },
  latex: { key: "latex", name: "LaTeX" },
  restructuredtext: { key: "rst", name: "reStructuredText" },
  asciidoc: { key: "asciidoc", name: "AsciiDoc" },

  // Specialized
  dockerfile: { key: "docker", name: "Docker" },
  dockercompose: { key: "docker", name: "Docker Compose" },
  nginx: { key: "nginx", name: "Nginx" },
  makefile: { key: "make", name: "Makefile" },
  cmake: { key: "cmake", name: "CMake" },
  gradle: { key: "gradle", name: "Gradle" },

  // Functional & Others
  haskell: { key: "haskell", name: "Haskell" },
  elixir: { key: "elixir", name: "Elixir" },
  erlang: { key: "erlang", name: "Erlang" },
  clojure: { key: "clojure", name: "Clojure" },
  fsharp: { key: "fsharp", name: "F#" },
  ocaml: { key: "ocaml", name: "OCaml" },
  r: { key: "r", name: "R" },
  julia: { key: "julia", name: "Julia" },

  // Assembly & Low-Level
  assembly: { key: "assembly", name: "Assembly" },
  llvm: { key: "llvm", name: "LLVM" },

  // Other
  plaintext: { key: "text", name: "Text" },
  log: { key: "log", name: "Log" },
  ini: { key: "ini", name: "INI" },
  properties: { key: "properties", name: "Properties" },
  gitignore: { key: "git", name: "Git Ignore" },
  gitconfig: { key: "git", name: "Git Config" },
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
   * Get idle timeout in minutes (converted to milliseconds)
   */
  getIdleTimeout(): number {
    const minutes = this.config.get<number>("idleTimeout", 0)
    return minutes * 60 * 1000
  }
}
