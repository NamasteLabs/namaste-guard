import * as vscode from 'vscode';

/**
 * Fetch the workspace configuration for the 'namaste-guard' extension.
 * The configuration contains user-defined custom patterns for secret scanning.
 */
export function getConfig() {
    return vscode.workspace.getConfiguration('namaste-guard');
}