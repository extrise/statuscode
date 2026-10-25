/**
 * Shared constants for the StatusCode extension.
 *
 * Kept free of VS Code imports so they can be unit tested with plain Node.
 *
 * @author Extrise
 * @license MIT
 */

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
