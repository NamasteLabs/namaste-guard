import * as vscode from 'vscode';

/**
 * Fetch the workspace configuration for the 'cipherscan' extension.
 * The configuration contains user-defined custom patterns for secret scanning.
 */
export function getConfig() {
    return vscode.workspace.getConfiguration('cipherscan');
}