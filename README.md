# StatusCode

[![Vs Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/extrise.statuscode?label=VS%20Code%20Marketplace&style=flat-square)](https://marketplace.visualstudio.com/items?itemName=extrise.statuscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Publish](https://img.shields.io/github/actions/workflow/status/extrise/statuscode/publish.yml?style=for-the-badge&logo=github&label=Publish)](https://github.com/extrise/statuscode/actions)

<div>
    <img src="https://raw.githubusercontent.com/extrise/statuscode/main/assets/demo.png" alt="StatusCode Demo" />
</div>

Show off your coding activity on Discord with StatusCode - a lightweight VS Code extension that brings beautiful Rich Presence integration to your development workflow.

## What is StatusCode?

StatusCode connects your Visual Studio Code to Discord, displaying what you're working on in real-time. Your friends and server members can see what file you're editing, which language you're coding in, and how long you've been at it.

Perfect for developers who want to share their coding journey, collaborate with teammates, or just show the world they're building something awesome.

## Features

- **Real-time Activity Tracking** - Automatically updates your Discord status as you code
- **Language Detection** - Shows icons for over 18 programming languages
- **File & Workspace Display** - Let people know what project and file you're working on
- **Elapsed Time Counter** - Display how long you've been coding
- **Highly Customizable** - Tweak every aspect of what appears on your Discord profile
- **Privacy Controls** - Choose exactly what information to share
- **Auto-Reconnect** - Seamlessly handles Discord restarts
- **Lightweight** - Minimal performance impact on your editor

## Installation

### Option 1: Install from VSIX file

1. Download `statuscode-{version}.vsix` from the [latest release](https://github.com/extrise/statuscode/releases)
2. Open VS Code
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
4. Type "Extensions: Install from VSIX"
5. Select the downloaded `.vsix` file
6. Restart VS Code

### Option 2: VS Code Marketplace

Search for "StatusCode" in the VS Code Extensions panel and click Install.

Or visit the [StatusCode Marketplace page](https://marketplace.visualstudio.com/items?itemName=extrise.statuscode) and click "Install".

## Quick Start

1. Make sure Discord is running on your computer
2. Open VS Code - StatusCode will automatically connect
3. Look at your Discord profile - you should see your activity

That's it. StatusCode works out of the box with sensible defaults.

## Configuration

StatusCode offers plenty of customization options. Open VS Code settings and search for "StatusCode" to configure:

### Basic Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `statuscode.enabled` | Enable or disable Rich Presence | `true` |
| `statuscode.showFileName` | Display the current file name | `true` |
| `statuscode.showWorkspace` | Display workspace/folder name | `true` |
| `statuscode.showLanguage` | Show programming language icon | `true` |
| `statuscode.showElapsedTime` | Show time since VS Code started | `true` |
| `statuscode.showFileIcon` | Show file type icon | `true` |

### Customization

| Setting | Description | Default |
|---------|-------------|---------|
| `statuscode.details` | Custom details text | `"Coding in Visual Studio Code"` |
| `statuscode.state` | Custom state text | `"Editing {filename}"` |
| `statuscode.largeImageText` | Hover text for large image | `"Visual Studio Code"` |

### Advanced

| Setting | Description | Default |
|---------|-------------|---------|
| `statuscode.idleTimeout` | Hide after X minutes idle (0 = disabled) | `0` |
| `statuscode.reconnectInterval` | Discord reconnect interval (ms) | `5000` |
| `statuscode.updateInterval` | Activity update interval (ms) | `15000` |

### Custom Text Variables

You can use these variables in your custom text:

- `{filename}` - Current file name (e.g., "index.ts")
- `{workspace}` - Workspace folder name (e.g., "my-project")
- `{language}` - Programming language (e.g., "TypeScript")

Example custom state: `"Working on {filename} in {workspace}"`

## Commands

StatusCode adds these commands to VS Code (access via `Ctrl+Shift+P` or `Cmd+Shift+P`):

- **StatusCode: Enable Rich Presence** - Turn on Discord presence
- **StatusCode: Disable Rich Presence** - Turn off Discord presence
- **StatusCode: Reconnect to Discord** - Force reconnect (useful if Discord was restarted)

You can also click the StatusCode icon in your status bar (bottom right) to quickly reconnect.

## Supported Languages

StatusCode recognizes these programming languages and shows appropriate icons:

JavaScript, TypeScript, Python, Java, C#, C++, C, Go, Rust, PHP, Ruby, HTML, CSS, JSON, Markdown, YAML, XML, SQL

Don't see your language? Open an issue and we'll add it.

## Troubleshooting

### Discord doesn't show my activity

1. Make sure Discord is running before starting VS Code
2. Check that Rich Presence is enabled in Discord Settings → Activity Privacy → Display current activity
3. Try running the command "StatusCode: Reconnect to Discord"
4. Restart both Discord and VS Code

### Status bar shows "Disabled"

StatusCode is turned off. Run "StatusCode: Enable Rich Presence" or check your settings.

### Connection keeps failing

- Ensure Discord desktop app is installed (not just browser version)
- Check if another app is using Discord RPC
- Try restarting Discord as administrator (Windows)

## Privacy

StatusCode only sends information you configure to Discord. By default, it shows:
- File name you're editing
- Workspace/project name
- Programming language
- Time elapsed

You can disable any of these in settings. StatusCode does not:
- Send file contents
- Track your keystrokes
- Collect any personal data
- Communicate with external servers (only Discord on your local machine)

## Contributing

Found a bug or want to request a feature? Open an issue on [GitHub](https://github.com/extrise/statuscode/issues).

Want to contribute code? Pull requests are welcome:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Building from Source

```bash
# Clone the repository
git clone https://github.com/extrise/statuscode.git
cd statuscode

# Install dependencies
npm install

# Compile the extension
npm run compile

# Package as VSIX
npm run package
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with [discord-rpc](https://github.com/discordjs/RPC) for seamless Discord integration.

Inspired by the developer community's love for showing off their code.

## Support

Having issues? Need help?

- Open an [issue on GitHub](https://github.com/extrise/statuscode/issues)
- Check existing issues for solutions
- Join the discussion in the community

---

Made with ❤️ by [Extrise](https://github.com/extrise)

**Happy Coding!**
