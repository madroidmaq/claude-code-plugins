/**
 * Plugin details view
 */

import { Detail, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { installPlugin, openInFinder, openInVSCode } from "./lib/claude-cli";
import { invalidateCache, CACHE_KEYS } from "./lib/cache-manager";
import { Plugin } from "./lib/types";

interface PluginDetailsProps {
  plugin: Plugin;
}

export default function PluginDetails({ plugin }: PluginDetailsProps) {
  const markdown = `
# ${plugin.name}

${plugin.description}

## Details

- **Version**: ${plugin.version}
- **Marketplace**: ${plugin.marketplace}
- **Author**: ${plugin.author?.name || "Unknown"} ${plugin.author?.email ? `(${plugin.author.email})` : ""}

## Components

${plugin.components.commands ? `- **Commands**: ${plugin.components.commands}` : ""}
${plugin.components.skills ? `- **Skills**: ${plugin.components.skills}` : ""}
${plugin.components.agents ? `- **Agents**: ${plugin.components.agents}` : ""}
${plugin.components.hooks ? `- **Hooks**: ${plugin.components.hooks}` : ""}
${plugin.components.mcp ? "- **MCP Servers**: Yes" : ""}

## Installation Status

${
  plugin.installStatus?.installed
    ? `✅ **Installed** (${plugin.installStatus.scope} scope, v${plugin.installStatus.version})`
    : "❌ **Not installed**"
}
  `;

  async function handleInstall(scope: "user" | "project" | "local") {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Installing plugin..." });
    try {
      const result = await installPlugin(`${plugin.name}@${plugin.marketplace}`, scope);
      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Plugin installed successfully";
        invalidateCache(CACHE_KEYS.ALL_PLUGINS);
        invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Installation failed";
        toast.message = result.error;
      }
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Installation failed";
      toast.message = error.message;
    }
  }

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={plugin.name} />
          <Detail.Metadata.Label title="Version" text={plugin.version} />
          <Detail.Metadata.Label title="Marketplace" text={plugin.marketplace} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Commands" text={plugin.components.commands?.toString() || "0"} />
          <Detail.Metadata.Label title="Skills" text={plugin.components.skills?.toString() || "0"} />
          <Detail.Metadata.Label title="Agents" text={plugin.components.agents?.toString() || "0"} />
          <Detail.Metadata.Label title="Hooks" text={plugin.components.hooks?.toString() || "0"} />
          <Detail.Metadata.Label title="MCP" text={plugin.components.mcp ? "Yes" : "No"} />
          <Detail.Metadata.Separator />
          {plugin.installStatus?.installed && (
            <>
              <Detail.Metadata.Label title="Scope" text={plugin.installStatus.scope || "unknown"} />
              <Detail.Metadata.Label
                title="Status"
                text={plugin.installStatus.enabled !== false ? "Enabled" : "Disabled"}
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!plugin.installStatus?.installed && (
            <ActionPanel.Section title="Installation">
              <Action title="Install (User Scope)" icon={Icon.Download} onAction={() => handleInstall("user")} />
              <Action
                title="Install (Project Scope)"
                icon={Icon.Download}
                onAction={() => handleInstall("project")}
              />
              <Action title="Install (Local Scope)" icon={Icon.Download} onAction={() => handleInstall("local")} />
            </ActionPanel.Section>
          )}
          {plugin.installStatus?.installed && plugin.installStatus.installPath && (
            <ActionPanel.Section title="Development">
              <Action
                title="Open in Finder"
                icon={Icon.Finder}
                onAction={() => openInFinder(plugin.installStatus!.installPath!)}
              />
              <Action
                title="Open in VS Code"
                icon={Icon.Code}
                onAction={() => openInVSCode(plugin.installStatus!.installPath!)}
              />
            </ActionPanel.Section>
          )}
          {plugin.repositoryUrl && (
            <ActionPanel.Section title="Links">
              <Action.OpenInBrowser title="View Repository" icon={Icon.Globe} url={plugin.repositoryUrl} />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Install Command"
              content={`claude plugin install ${plugin.name}@${plugin.marketplace}`}
            />
            <Action.CopyToClipboard title="Copy Plugin ID" content={`${plugin.name}@${plugin.marketplace}`} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
