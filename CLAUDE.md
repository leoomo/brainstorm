# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Chrome Extension (Manifest V3)** called "AI 讨论助手" (AI Discussion Assistant). It enables users to generate product documentation through multi-model AI discussions.

**Project location**: `brainstorm_chat/`

## Commands

### Load/Reload Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select the `brainstorm_chat/` directory
4. Make changes to any file, then click the refresh button on the extension card

### Development build process
- No required - this is a pure Chrome extension
- Edit files directly in `brainstorm_chat/`
- Hot-reload via Chrome extensions page

## Architecture

### File Structure
```
brainstorm_chat/
├── manifest.json          # Extension manifest (MV3)
├── background/
│   └── background.js      # Service worker - handles API calls & discussion logic
├── sidebar/               # Sidebar panel (main UI)
│   ├── sidebar.html       # Main HTML structure
│   ├── sidebar.js         # Main UI logic & state management
│   └── marked.min.js      # Markdown parser
├── shared/                # Shared components
│   ├── state.js           # State management (StateManager)
│   ├── components.js      # UI components (BottomPanel, DiscussionCard)
│   └── utils.js           # Utility functions
├── styles/
│   └── main.css           # All styles
└── icons/
    └── icon.svg           # Extension icon (replace with PNG for production)
```

### Data Flow
1. User enters requirement in sidebar → `sidebar.js`
2. Sidebar sends message to `background.js` via `chrome.runtime.sendMessage()`
3. Background service worker calls AI APIs (OpenAI/Anthropic/DeepSeek/Qwen/GLM/Moonshot/Spark)
4. Streaming responses sent back to sidebar via message ports
5. Discussion events displayed in BottomPanel component
6. Final document generated and saved to `chrome.storage.local`

### Key Components

**DiscussionEngine** (`background/background.js`):
- `roundTable()` - Sequential round-robin discussion
- `brainstorm()` - Parallel independent generation
- `debate()` - Critical review mode

**BottomPanel** (`shared/components.js`):
- Real-time timeline display
- Expandable/collapsible panel
- Fullscreen mode for detailed viewing

**StateManager** (`shared/state.js`):
- API configuration management
- Discussion list management
- Project management

### API Support
- OpenAI (GPT-4/Claude)
- Anthropic (Claude)
- DeepSeek
- Qwen (阿里通义)
- GLM (智谱)
- Moonshot (月之暗面)
- Spark (讯飞)

### Three Discussion Modes
| Mode | Behavior |
|------|----------|
| `round-table` | Models take turns, building on previous responses |
| `brainstorm` | All models respond simultaneously, then merged |
| `debate` | Critical review with back-and-forth |

## Important Notes

- Extension uses sidebar panel (not popup)
- API keys are stored in plain text in `chrome.storage.local` (not secure for shared machines)
- The icon is currently an SVG - for production, generate PNG icons at 16x16, 48x48, and 128x128
- Maximum discussion rounds: 10 (default: 3)
- Discussions are automatically saved to project list (no separate history)
- Host model can be designated to summarize rounds
