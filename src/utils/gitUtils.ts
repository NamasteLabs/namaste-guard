import * as vscode from 'vscode';
import * as fs from 'fs';
import path from 'path';
import { getConfig } from '../constants/config';
import { logMessage } from './loggingUtils';

/**
 * Prompts the user to run a secret scan before pushing committed changes.
 * If the user selects 'Yes', the scan is triggered via a VS Code command.
 * 
 * @param context - The VS Code extension context used for executing the scan.
 */
function promptForSecretScan(context: vscode.ExtensionContext): void {
    vscode.window
        .showInformationMessage(
            'You have committed changes. Would you like to run a scan for secrets before pushing?',
            'Yes',
            'No'
        )
        .then((selection) => {
            if (selection === 'Yes') {
                vscode.commands.executeCommand('cipherscan.startScan', context);
            }
        });
}

/**
 * Watches the `.git/logs/HEAD` file for commit events in all relevant root folders and prompts the user to scan for secrets.
 * Registers file system watchers to detect changes to commit logs in each root folder and triggers the scan prompt.
 * 
 * @param context - The VS Code extension context for managing subscriptions.
 */
export function watchGitCommit(context: vscode.ExtensionContext): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
        return; // Exit if no workspace is open
    }

    // Iterate over all root folders in the workspace
    workspaceFolders.forEach((folder) => {
        try {
            const gitLogsPath = path.join(folder.uri.fsPath, '.git', 'logs', 'HEAD');

            // Create a file system watcher for the `.git/logs/HEAD` file in each root folder
            const gitWatcher = vscode.workspace.createFileSystemWatcher(gitLogsPath);
            gitWatcher.onDidChange(() => promptForSecretScan(context)); // Trigger scan prompt on commit

            context.subscriptions.push(gitWatcher); // Ensure watcher is disposed properly
        } catch (error) {
            logMessage('Error initializing Git commit watcher.', 'error');
        }
    });
}

/**
 * Ensures the `.cipherscan` folder is added to `.gitignore` to prevent Git from tracking scan reports.
 * Prompts the user once before modifying the `.gitignore` files for all root folders and appends `.cipherscan` if it’s not already listed.
 */
export async function addToGitIgnore(): Promise<void> {
    const config = getConfig(); // Fetch the latest configuration
    const gitIgnoreBoolean = config.get<boolean>('addToGitIgnore', true); // Default to true

    if (!gitIgnoreBoolean) return; // Exit if setting is disabled

    // Get all root folders (supporting multi-root workspaces)
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    if (workspaceFolders.length === 0) return; // No workspace is open

    // Track which folders need `.cipherscan` added
    const foldersNeedingUpdate: { gitignorePath: string; folderName: string }[] = [];

    // Check all root folders for `.gitignore` status
    for (const folder of workspaceFolders) {
        const gitFolderPath = path.join(folder.uri.fsPath, '.git');
        const gitignorePath = path.join(folder.uri.fsPath, '.gitignore');

        // Ensure .git directory exists and check if .gitignore needs modification
        if (fs.existsSync(gitFolderPath) && fs.statSync(gitFolderPath).isDirectory()) {
            let gitignoreContent = '';
            try {
                gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8'); // Read existing .gitignore
            } catch {
                fs.writeFileSync(gitignorePath, ''); // Create .gitignore if it doesn't exist
            }

            // Add to list if `.cipherscan` is not already in `.gitignore`
            if (!gitignoreContent.includes('.cipherscan')) {
                foldersNeedingUpdate.push({ gitignorePath, folderName: folder.name });
            }
        }
    }

    // If no folders need updates, exit early
    if (foldersNeedingUpdate.length === 0) return;

    // Prompt user once
    const response = await vscode.window.showInformationMessage(
        'The .cipherscan folder stores scan reports. Add it to .gitignore to avoid Git tracking?',
        'Yes',
        'No'
    );

    if (response === 'Yes') {
        const updatedFolders: string[] = [];

        // Apply updates to all applicable folders
        for (const { gitignorePath, folderName } of foldersNeedingUpdate) {
            try {
                fs.appendFileSync(gitignorePath, '\n# Ignore .cipherscan folder\n.cipherscan\n');
                updatedFolders.push(folderName); // Track successfully updated folders
            } catch (error) {
                logMessage(`Failed to modify .gitignore in ${folderName}.`, 'error');
            }
        }

        if (updatedFolders.length > 0) {
            vscode.window.showInformationMessage(
                `.cipherscan folder added to .gitignore in ${updatedFolders.join(', ')}.`
            );
        } else {
            vscode.window.showInformationMessage('Failed to add .cipherscan folder to .gitignore.');
        }
    }
}

/**
 * Checks the `cipherscan.addToGitIgnore` setting and calls `addToGitIgnore` if enabled.
 */
export function checkAndAddToGitIgnore(): void {
    const config = getConfig();
    const gitIgnoreBoolean = config.get<boolean>('addToGitIgnore', true);

    if (gitIgnoreBoolean) {
        addToGitIgnore(); // Add .cipherscan to .gitignore if setting is enabled
    }
}

/**
 * Sets up listeners for workspace folder changes and configuration changes.
 * Ensures `.gitignore` is updated dynamically as the workspace or settings change.
 * 
 * @param context - The VS Code extension context for managing subscriptions.
 */
export function setupGitIgnoreListeners(context: vscode.ExtensionContext): void {
    // Initial check on activation
    checkAndAddToGitIgnore();

    // Listen for workspace folder changes
    const folderChangeListener = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        checkAndAddToGitIgnore();
    });

    // Watch for configuration changes
    const configChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('cipherscan.addToGitIgnore')) {
            checkAndAddToGitIgnore();
        }
    });

    // Add listeners to context.subscriptions to ensure they are cleaned up on deactivation
    context.subscriptions.push(folderChangeListener, configChangeListener);
}
