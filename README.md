# trigr

A cross-platform text expander that runs in the background. Define trigger keywords that automatically expand into text, code snippets, or dynamic expressions.

## Features

- **Trigger-based expansion**: Type a trigger keyword and it automatically expands
- **Argument mode**: Use `!` to capture arguments for dynamic replacements
- **Variables**: Define global variables using Trill expressions
- **Scripting**: Use Trill for complex transformations and conditions
- **Packages**: Install pre-made trigger packages for common content
- **System tray**: Runs in background, accessible via system tray icon
- **Cross-platform**: Windows support with hotkey listener

## Development

### Prerequisites

- Node.js 18+
- Rust 1.70+
- npm or pnpm

### Setup

```bash
npm install
```

### Run Development Server

```bash
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

## Usage

1. **Create Triggers**: Go to the Triggers tab and click "New Trigger"
   - Set a trigger text (e.g., `;email`)
   - Set the replacement text (e.g., `john@example.com`)

2. **Use Arguments**: Enable argument mode to capture typed text after the trigger
   - Trigger: `;cap`
   - Replacement: `{{upper(args)}}`
   - Type: `;cap hello` → `HELLO`

3. **Use Variables**: Define global variables in the Variables tab
   - Variable: `{{name}}`
   - Script: `"John"`

4. **Install Packages**: Browse and install trigger packages from the Packages tab

## Keyboard

- `Escape`: Cancel argument capture or close dialogs
- Ender character (default `!`): Finalizes argument capture

## Tech Stack

- Tauri 2 (Rust backend)
- React + TypeScript (frontend)
- Vite (build tool)
- Trill (scripting engine for replacements)