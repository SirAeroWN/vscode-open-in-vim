# Open in Vim

Open current file in vim. To activate this extension, open the [Command
Palette] (Ctrl+Shift+P on linux or ⇧⌘P on mac) and search for "Open in Vim".
Alternatively, you can [assign a keyboard shortcut of your choosing].

[Command Palette]: https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette
[assign a keyboard shortcut of your choosing]: https://code.visualstudio.com/docs/getstarted/keybindings#_keyboard-shortcuts-editor

This is a more Windows-centric fork of Open in Vim by [Jon Smithers](https://github.com/jonsmithers/vscode-open-in-vim)

## Extension Settings

* **`open-in-vim.openMethod`**: specifies how vim should be launched. Allowed
  values are tabulated below.

  | Value                  | Description                                               |
  | ---------------------- | --------------------------------------------------------- |
  | `path`                 | Use the executable specified by `open-in-vim.vimPath`
  | `integrated-terminal`  | (DEFAULT) Open vim in VSCode's integrated terminal.       |

* **`open-in-vim.useNeovim`**: whether to launch vim or neovim (ignored when
  `openMethod` is set to path).
* Other settings for specific openMethods are tabulated below.

  | Setting                                       | Description                                                                                 | Default                                            |
  | --------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------     |
  | `open-in-vim.integrated-terminal.pathToShell` | Path to unix shell which will host the vim process.                                         | `/bin/bash` or `C:\Program Files\Git\bin\bash.exe` |
