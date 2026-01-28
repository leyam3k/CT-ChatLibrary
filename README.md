# CT-ChatLibrary

A SillyTavern/CozyTavern extension that adds a dedicated Chat Library view alongside the standard Character Library, allowing users to quickly browse and open all chats across all characters in one unified interface.

## Features

- **Toggle View System**: Seamlessly switch between Character Library and Chat Library views with a single click
- **Unified Chat Browser**: View all chats from all characters in one consolidated list
- **Smart Sorting**: Chats are automatically sorted by last message date (most recent first)
- **Search Functionality**: Quickly filter chats by character name or chat filename
- **Visual Integration**: Designed to match SillyTavern's UI theme and styling perfectly
- **One-Click Access**: Open any chat directly from the library view
- **Character Avatars**: Each chat displays the associated character's avatar for easy recognition
- **Metadata Display**: Shows message count and last modified date for each chat

## Installation and Usage

### Installation

1. Navigate to your SillyTavern installation directory
2. Go to `public/scripts/extensions/third-party/`
3. Clone or download this repository into that directory:
   ```bash
   git clone https://github.com/leyam3k/CT-ChatLibrary.git
   ```
4. Restart SillyTavern or reload the page
5. The extension will automatically load on startup

### Usage

1. **Finding the Toggle Button**: Look for the chat icon (💬) in the tag filter area above your character list
2. **Switching Views**: 
   - Click the chat icon to switch to Chat Library view
   - Click it again to return to Character Library view
   - The button glows when Chat Library is active
3. **Browsing Chats**:
   - All chats are displayed with character avatars, names, and timestamps
   - Most recent chats appear at the top
4. **Searching**: Use the search bar at the top to filter by character name or chat filename
5. **Opening a Chat**: Click any chat card to immediately load that conversation
6. **Refreshing**: Click the refresh button (🔄) to reload the chat list

## Interface Overview

When in Chat Library mode, you'll see:
- **Search Bar**: Filter chats in real-time
- **Refresh Button**: Manually refresh the chat list
- **Chat Cards**: Each showing:
  - Character avatar
  - Chat filename
  - Character name
  - Last modified date/time
  - Message count

## Prerequisites

- SillyTavern version 1.10.0 or higher
- Modern web browser with JavaScript enabled
- At least one character with existing chats

## Technical Details

The extension works by:
- Fetching chat metadata from all available characters via ST's API
- Organizing and sorting chats by date
- Hiding the default character list when in Chat Library mode
- Providing a clean, responsive interface that matches ST's design language

## License

MIT License
