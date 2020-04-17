import * as vscode from 'vscode';
import * as fs from 'fs';
import * as tmp from 'tmp';
import * as os from 'os';
import * as opn from 'opn';
import { execSync } from 'child_process';

/*
 * Called when extension is activated. This happens the very first time the
 * command is executed
 */
export function activate(context: vscode.ExtensionContext) {

    // implements command declared in package.json file
    let disposable = vscode.commands.registerCommand('open-in-vim.open', function() {
        try {
            openInVim();
        } catch(e) {
            console.error(e);
            vscode.window.showErrorMessage("Open in Vim failed: " + e);
        }
    });

    context.subscriptions.push(disposable);
}

/*
 * Called when extension is deactivated
 */
export function deactivate() {
}

type Config = {
    openMethod: OpenMethodKey;
    useNeovim: boolean;
    gvimPath: string;
    'integrated-terminal': {
        pathToShell: string;
    },
};

const PATH_TO_WINDOWS_GIT_SHELL = 'C:\\Program Files\\Git\\bin\\bash.exe';
function getConfiguration(): Config {
    let configuration = { ...vscode.workspace.getConfiguration()["open-in-vim"] };
    if (!configuration['integrated-terminal']) {
        configuration['integrated-terminal'] = {};
    }
    if (!configuration['integrated-terminal'].pathToShell) {
        configuration['integrated-terminal'] = {
            ...configuration['integrated-terminal'],
            pathToShell: os.type().startsWith('Windows') ? PATH_TO_WINDOWS_GIT_SHELL : '/bin/bash'
        };
    }

    return configuration;
}

function openInVim() {
    const { openMethod, useNeovim, gvimPath } = getConfiguration();

    let activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
        vscode.window.showErrorMessage('No active editor.');
        return;
    }
    if (activeTextEditor.document.isUntitled) {
        vscode.window.showErrorMessage('Please save the file first.');
        return;
    }
    if (activeTextEditor.document.isDirty) {
        activeTextEditor.document.save();
    }

    let actualOpenMethod = openMethods[openMethod];
    if (!actualOpenMethod) {
        let availableMethods = Object.keys(openMethods).map(name => `"${name}"`).join(", ");
        vscode.window.showErrorMessage(`Check your settings. Method "${openMethod}" is not supported. Currently, you can use ${availableMethods}.`);
        return;
    }

    function getAlternateWorkspacePath(): string {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length) {
            // default to first available workspace
            const workspace = vscode.workspace.workspaceFolders[0];
            vscode.window.setStatusBarMessage(`OpenInVim defaulted vim working dir to ${workspace.name}`, 5000);
            return workspace.uri.path;
        } else {
            // NO workspaces are open, so just use home
            return os.homedir();
        }
    }

    const workspace = vscode.workspace.getWorkspaceFolder(activeTextEditor.document.uri);
    const workspacePath = workspace ? workspace.uri.path : getAlternateWorkspacePath();

    let position = activeTextEditor.selection.active;
    let fileName = activeTextEditor.document.fileName;
    let line = position.line+1;

    actualOpenMethod({
        vim: openMethod == 'path' ? gvimPath : useNeovim ? 'nvim' : 'vim',
        fileName: fileName,
        // cannot contain double quotes
        args: `+${line}`,
        workspacePath,
    });
}

type OpenMethodKey = 'path' | 'integrated-terminal';

interface OpenMethodsArgument {
    vim: string;
    fileName: string;
    args: string;
    workspacePath: string;
}

type OpenMethods = {
    [key in OpenMethodKey]: (a: OpenMethodsArgument) => void;
};

function openArgsToScriptFile(openArgs: OpenMethodsArgument) {
    let tmpFile = tmp.fileSync();
    fs.writeFileSync(tmpFile.name, `
        cd '${openArgs.workspacePath}'
        ${openArgs.vim} '${openArgs.fileName}' ${openArgs.args}; exit
    `);
    return tmpFile.name;
}

/**
 * example: converts `\C:\test\file.txt` to `/c/test/file.txt`
 *                                       or `/mnt/c/test/file.txt` (for isWslStyle=true)
 */
function ensureUnixPathFormat(path: string, isWslStyle: boolean): string {
    if (os.type().startsWith('Windows')) {
        return path
            .replace(/^\/?(\w):/, (str, driveLetter) => `/${isWslStyle ? 'mnt/' : ''}${driveLetter.toLowerCase()}`)
            .replace(/\\/g, '/');
    } else {
        return path;
    }
}

const openMethods: OpenMethods = {
    "path": function(openArgs: OpenMethodsArgument) {
        execSync(`${openArgs.vim} ${openArgs.args} -- ${openArgs.fileName}`, {
            cwd: openArgs.workspacePath,
            encoding: "utf8"
        });
    },
    "integrated-terminal": function (openArgs: OpenMethodsArgument) {
        const shellPath = getConfiguration()['integrated-terminal'].pathToShell;

        if (!fs.existsSync(shellPath)) {
            if (os.type().startsWith('Windows') && shellPath === PATH_TO_WINDOWS_GIT_SHELL) {
                const installGit = 'Install Git';
                vscode.window.showErrorMessage(`Failed to find unix shell. If you install Git, open-in-vim can use "${PATH_TO_WINDOWS_GIT_SHELL}".`, installGit).then(choice => {
                    if (choice === installGit) {
                        opn('https://git-scm.com/download/win');
                    }
                });
            } else {
                vscode.window.showErrorMessage(`Failed to find unix shell "${shellPath}". Check your settings.`);
            }
            return;
        }

        /** Windows Subsystem for Linux sees different paths than git bash */
        const isWslStyle =
            os.type().startsWith('Windows') &&
            (0 === require('child_process')
                .spawnSync(shellPath, ['-c', 'test -d /mnt/c'])
                .status);

        openArgs.fileName = ensureUnixPathFormat(openArgs.fileName, isWslStyle);
        openArgs.workspacePath = ensureUnixPathFormat(openArgs.workspacePath, isWslStyle);
        let terminal = vscode.window.createTerminal({
            name: "Open in Vim",
            shellPath,
            shellArgs: [
                ensureUnixPathFormat(openArgsToScriptFile(openArgs), isWslStyle)
            ]
        });
        terminal.show(true);
        vscode.commands.executeCommand("workbench.action.terminal.focus");
    },
};
