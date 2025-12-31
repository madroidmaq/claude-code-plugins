/**
 * Claude CLI wrapper functions
 * Handles all interactions with the Claude Code CLI
 */

import { execSync } from "child_process";
import { homedir } from "os";
import path from "path";
import fs from "fs";
import {
  Plugin,
  Marketplace,
  InstalledPlugin,
  CLIResult,
  PluginManifest,
  InstalledPluginsData,
  MarketplacesData,
  ClaudeNotInstalledError,
} from "./types";

const CLAUDE_HOME = path.join(homedir(), ".claude");
const PLUGINS_DIR = path.join(CLAUDE_HOME, "plugins");

// Common paths where Claude CLI might be installed
const CLAUDE_PATHS = [
  "claude", // In PATH
  path.join(homedir(), ".local/bin/claude"), // pipx default
  "/usr/local/bin/claude", // Homebrew
  "/opt/homebrew/bin/claude", // Homebrew on Apple Silicon
  path.join(homedir(), ".npm-global/bin/claude"), // npm global
  path.join(homedir(), ".nvm/versions/node/*/bin/claude"), // nvm
];

/**
 * Find Claude CLI executable path
 */
function findClaudePath(): string | null {
  // Try each possible path
  for (const claudePath of CLAUDE_PATHS) {
    try {
      // Skip paths with wildcards for now
      if (claudePath.includes("*")) continue;

      // Try to execute --version to verify it works
      execSync(`"${claudePath}" --version`, { encoding: "utf-8", stdio: "pipe" });
      return claudePath;
    } catch {
      // Continue to next path
      continue;
    }
  }

  // Try using 'which' as fallback
  try {
    const result = execSync("which claude", { encoding: "utf-8", stdio: "pipe" });
    return result.trim();
  } catch {
    return null;
  }
}

// Cache the Claude path to avoid repeated lookups
let cachedClaudePath: string | null | undefined = undefined;

/**
 * Get Claude CLI path (with caching)
 */
function getClaudePath(): string {
  if (cachedClaudePath === undefined) {
    cachedClaudePath = findClaudePath();
  }

  if (!cachedClaudePath) {
    throw new ClaudeNotInstalledError();
  }

  return cachedClaudePath;
}

/**
 * Check if Claude CLI is installed
 */
export function isClaudeInstalled(): boolean {
  try {
    getClaudePath();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all installed plugins by reading installed_plugins.json
 */
export async function getInstalledPlugins(): Promise<InstalledPlugin[]> {
  const filePath = path.join(PLUGINS_DIR, "installed_plugins.json");

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data: InstalledPluginsData = JSON.parse(content);

    const plugins: InstalledPlugin[] = [];
    for (const [pluginId, installations] of Object.entries(data.plugins)) {
      for (const install of installations) {
        plugins.push({
          pluginId,
          ...install,
        });
      }
    }
    return plugins;
  } catch (error) {
    console.error("Failed to read installed plugins:", error);
    return [];
  }
}

/**
 * Get all marketplaces by reading known_marketplaces.json
 */
export async function getMarketplaces(): Promise<Marketplace[]> {
  const filePath = path.join(PLUGINS_DIR, "known_marketplaces.json");

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data: MarketplacesData = JSON.parse(content);

    return Object.entries(data).map(([name, info]) => ({
      name,
      source: info.source as Marketplace["source"],
      installLocation: info.installLocation,
      lastUpdated: info.lastUpdated,
    }));
  } catch (error) {
    console.error("Failed to read marketplaces:", error);
    return [];
  }
}

/**
 * Parse plugin metadata from plugin directory
 */
async function parsePluginMetadata(pluginPath: string): Promise<Partial<Plugin> | null> {
  try {
    // Try to read .claude-plugin/plugin.json
    const manifestPath = path.join(pluginPath, ".claude-plugin", "plugin.json");

    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    // Count components
    const components = {
      commands: countFiles(path.join(pluginPath, "commands")),
      skills: countFiles(path.join(pluginPath, "skills")),
      agents: countFiles(path.join(pluginPath, "agents")),
      hooks: fs.existsSync(path.join(pluginPath, "hooks", "hooks.json")) ? 1 : 0,
      mcp: fs.existsSync(path.join(pluginPath, ".mcp.json")),
    };

    // Extract repository URL
    let repositoryUrl: string | undefined;
    if (manifest.repository?.url) {
      repositoryUrl = manifest.repository.url.replace(/^git\+/, "").replace(/\.git$/, "");
    }

    return {
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      components,
      repositoryUrl,
    };
  } catch (error) {
    console.error(`Failed to parse plugin metadata at ${pluginPath}:`, error);
    return null;
  }
}

/**
 * Count files in a directory (commands, skills, agents)
 */
function countFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith(".md") || f.endsWith(".sh")).length;
  } catch {
    return 0;
  }
}

/**
 * Get all available plugins from all marketplaces
 */
export async function getAllAvailablePlugins(): Promise<Plugin[]> {
  const marketplaces = await getMarketplaces();
  const installedPlugins = await getInstalledPlugins();

  const allPlugins: Plugin[] = [];

  for (const marketplace of marketplaces) {
    const pluginsDir = path.join(marketplace.installLocation, "plugins");
    if (!fs.existsSync(pluginsDir)) continue;

    try {
      const pluginDirs = fs.readdirSync(pluginsDir);

      for (const pluginDir of pluginDirs) {
        const pluginPath = path.join(pluginsDir, pluginDir);
        if (!fs.statSync(pluginPath).isDirectory()) continue;

        const pluginMetadata = await parsePluginMetadata(pluginPath);

        if (pluginMetadata && pluginMetadata.name) {
          // Check if installed
          const pluginId = `${pluginDir}@${marketplace.name}`;
          const installed = installedPlugins.find((p) => p.pluginId === pluginId);

          allPlugins.push({
            name: pluginMetadata.name,
            version: pluginMetadata.version || "unknown",
            description: pluginMetadata.description || "",
            author: pluginMetadata.author,
            marketplace: marketplace.name,
            components: pluginMetadata.components || {},
            repositoryUrl: pluginMetadata.repositoryUrl,
            installStatus: installed
              ? {
                  installed: true,
                  scope: installed.scope,
                  version: installed.version,
                  installPath: installed.installPath,
                  enabled: installed.enabled,
                }
              : {
                  installed: false,
                },
          });
        }
      }
    } catch (error) {
      console.error(`Failed to read plugins from marketplace ${marketplace.name}:`, error);
    }
  }

  return allPlugins;
}

/**
 * Install a plugin using Claude CLI
 */
export async function installPlugin(
  pluginName: string,
  scope: "user" | "project" | "local" = "user"
): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(`"${claudePath}" plugin install "${pluginName}" --scope ${scope}`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    return { success: true, output };
  } catch (error: any) {
    return {
      success: false,
      output: "",
      error: error.stderr || error.message,
    };
  }
}

/**
 * Uninstall a plugin using Claude CLI
 */
export async function uninstallPlugin(
  pluginName: string,
  scope: "user" | "project" | "local" = "user"
): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(`"${claudePath}" plugin uninstall "${pluginName}" --scope ${scope}`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    return { success: true, output };
  } catch (error: any) {
    return {
      success: false,
      output: "",
      error: error.stderr || error.message,
    };
  }
}

/**
 * Enable a plugin using Claude CLI
 */
export async function enablePlugin(
  pluginName: string,
  scope: "user" | "project" | "local" = "user"
): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(`"${claudePath}" plugin enable "${pluginName}" --scope ${scope}`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    return { success: true, output };
  } catch (error: any) {
    return {
      success: false,
      output: "",
      error: error.stderr || error.message,
    };
  }
}

/**
 * Disable a plugin using Claude CLI
 */
export async function disablePlugin(
  pluginName: string,
  scope: "user" | "project" | "local" = "user"
): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(`"${claudePath}" plugin disable "${pluginName}" --scope ${scope}`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    return { success: true, output };
  } catch (error: any) {
    return {
      success: false,
      output: "",
      error: error.stderr || error.message,
    };
  }
}

/**
 * Update a plugin using Claude CLI
 */
export async function updatePlugin(
  pluginName: string,
  scope: "user" | "project" | "local" = "user"
): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(`"${claudePath}" plugin update "${pluginName}" --scope ${scope}`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    return { success: true, output };
  } catch (error: any) {
    return {
      success: false,
      output: "",
      error: error.stderr || error.message,
    };
  }
}

/**
 * Add a marketplace using Claude CLI
 */
export async function addMarketplace(source: string): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(`"${claudePath}" plugin marketplace add "${source}"`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    return { success: true, output };
  } catch (error: any) {
    return {
      success: false,
      output: "",
      error: error.stderr || error.message,
    };
  }
}

/**
 * Remove a marketplace using Claude CLI
 */
export async function removeMarketplace(name: string): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(`"${claudePath}" plugin marketplace remove "${name}"`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    return { success: true, output };
  } catch (error: any) {
    return {
      success: false,
      output: "",
      error: error.stderr || error.message,
    };
  }
}

/**
 * Update a marketplace using Claude CLI
 */
export async function updateMarketplace(name?: string): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const cmd = name
      ? `"${claudePath}" plugin marketplace update "${name}"`
      : `"${claudePath}" plugin marketplace update`;
    const output = execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
    return { success: true, output };
  } catch (error: any) {
    return {
      success: false,
      output: "",
      error: error.stderr || error.message,
    };
  }
}

/**
 * Validate a plugin using Claude CLI
 */
export async function validatePlugin(pluginPath: string): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(`"${claudePath}" plugin validate "${pluginPath}"`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    return { success: true, output };
  } catch (error: any) {
    return {
      success: false,
      output: "",
      error: error.stderr || error.message,
    };
  }
}

/**
 * Open a path in Finder (macOS)
 */
export async function openInFinder(filePath: string): Promise<void> {
  execSync(`open "${filePath}"`);
}

/**
 * Open a path in VS Code
 */
export async function openInVSCode(filePath: string): Promise<void> {
  try {
    execSync(`code "${filePath}"`);
  } catch {
    // Fallback to opening in Finder if VS Code is not installed
    await openInFinder(filePath);
  }
}
