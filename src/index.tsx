/**
 * Browse Claude Plugins - Main command
 */

import { List, ActionPanel, Action, Icon, Color, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState } from "react";
import { usePlugins } from "./hooks/usePlugins";
import { installPlugin, updatePlugin, uninstallPlugin, enablePlugin, disablePlugin, openInFinder, openInVSCode } from "./lib/claude-cli";
import { invalidateCache, CACHE_KEYS } from "./lib/cache-manager";
import { ErrorView } from "./components/ErrorView";

export default function BrowsePlugins() {
  const { plugins, isLoading, error, refetch } = usePlugins();
  const [searchText, setSearchText] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>("all");

  if (error) {
    return <ErrorView error={error} />;
  }

  const filteredPlugins = plugins.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      p.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesMarketplace = marketplaceFilter === "all" || p.marketplace === marketplaceFilter;
    return matchesSearch && matchesMarketplace;
  });

  const marketplaces = ["all", ...new Set(plugins.map((p) => p.marketplace))];

  async function handleInstall(pluginName: string, marketplace: string, scope: "user" | "project" | "local") {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Installing plugin..." });
    try {
      const result = await installPlugin(`${pluginName}@${marketplace}`, scope);
      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Plugin installed successfully";
        invalidateCache(CACHE_KEYS.ALL_PLUGINS);
        invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
        refetch();
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

  async function handleUpdate(pluginId: string, scope: "user" | "project" | "local") {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating plugin..." });
    try {
      const result = await updatePlugin(pluginId, scope);
      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Plugin updated successfully";
        invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
        invalidateCache(CACHE_KEYS.ALL_PLUGINS);
        refetch();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Update failed";
        toast.message = result.error;
      }
    } catch (err: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      toast.message = err.message;
    }
  }

  async function handleUninstall(pluginId: string, scope: "user" | "project" | "local") {
    if (
      await confirmAlert({
        title: "Uninstall Plugin",
        message: `Are you sure you want to uninstall ${pluginId}?`,
        primaryAction: {
          title: "Uninstall",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Uninstalling plugin..." });
      try {
        const result = await uninstallPlugin(pluginId, scope);
        if (result.success) {
          toast.style = Toast.Style.Success;
          toast.title = "Plugin uninstalled";
          invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
          invalidateCache(CACHE_KEYS.ALL_PLUGINS);
          refetch();
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Uninstall failed";
          toast.message = result.error;
        }
      } catch (err: any) {
        toast.style = Toast.Style.Failure;
        toast.title = "Uninstall failed";
        toast.message = err.message;
      }
    }
  }

  async function handleEnable(pluginId: string, scope: "user" | "project" | "local") {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Enabling plugin..." });
    try {
      const result = await enablePlugin(pluginId, scope);
      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Plugin enabled";
        invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
        invalidateCache(CACHE_KEYS.ALL_PLUGINS);
        refetch();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Enable failed";
        toast.message = result.error;
      }
    } catch (err: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Enable failed";
      toast.message = err.message;
    }
  }

  async function handleDisable(pluginId: string, scope: "user" | "project" | "local") {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Disabling plugin..." });
    try {
      const result = await disablePlugin(pluginId, scope);
      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Plugin disabled";
        invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
        invalidateCache(CACHE_KEYS.ALL_PLUGINS);
        refetch();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Disable failed";
        toast.message = result.error;
      }
    } catch (err: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Disable failed";
      toast.message = err.message;
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search plugins..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Marketplace" value={marketplaceFilter} onChange={setMarketplaceFilter}>
          {marketplaces.map((m) => (
            <List.Dropdown.Item key={m} title={m} value={m} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredPlugins.length === 0 && !isLoading && (
        <List.EmptyView
          title="No plugins found"
          description="Try adjusting your search or marketplace filter"
          icon={Icon.MagnifyingGlass}
        />
      )}
      {filteredPlugins.map((plugin) => {
        const accessories: List.Item.Accessory[] = [];

        if (plugin.installStatus?.installed) {
          accessories.push({ tag: { value: "Installed", color: Color.Green } });
        }

        // Build component line
        const buildComponentLine = (
          title: string,
          component?: { count: number; names: string[] },
        ): string => {
          if (!component || component.count === 0) return "";
          return `- **${title}**: ${component.names.join("、")}\n`;
        };

        const markdown = `
# ${plugin.name}

${plugin.description}

## Details

- **Version**: ${plugin.version}
- **Marketplace**: ${plugin.marketplace}
- **Author**: ${plugin.author?.name || "Unknown"} ${plugin.author?.email ? `(${plugin.author.email})` : ""}

## Components

${buildComponentLine("Commands", plugin.components.commands)}${buildComponentLine("Skills", plugin.components.skills)}${buildComponentLine("Agents", plugin.components.agents)}${buildComponentLine("Hooks", plugin.components.hooks)}${plugin.components.mcp ? "- **MCP Servers**: Enabled\n" : ""}
        `;

        return (
          <List.Item
            key={`${plugin.name}@${plugin.marketplace}`}
            title={plugin.name}
            accessories={accessories}
            detail={<List.Item.Detail markdown={markdown} />}
            actions={
              <ActionPanel>
                {!plugin.installStatus?.installed ? (
                  <ActionPanel.Section title="Installation">
                    <Action
                      title="Install (User Scope)"
                      icon={Icon.Download}
                      onAction={() => handleInstall(plugin.name, plugin.marketplace, "user")}
                    />
                    <Action
                      title="Install (Project Scope)"
                      icon={Icon.Download}
                      onAction={() => handleInstall(plugin.name, plugin.marketplace, "project")}
                    />
                    <Action
                      title="Install (Local Scope)"
                      icon={Icon.Download}
                      onAction={() => handleInstall(plugin.name, plugin.marketplace, "local")}
                    />
                  </ActionPanel.Section>
                ) : (
                  <ActionPanel.Section title="Management">
                    <Action
                      title="Update Plugin"
                      icon={Icon.ArrowClockwise}
                      onAction={() => handleUpdate(`${plugin.name}@${plugin.marketplace}`, plugin.installStatus!.scope!)}
                    />
                    {plugin.installStatus.enabled !== false ? (
                      <Action
                        title="Disable Plugin"
                        icon={Icon.XMarkCircle}
                        onAction={() => handleDisable(`${plugin.name}@${plugin.marketplace}`, plugin.installStatus!.scope!)}
                      />
                    ) : (
                      <Action
                        title="Enable Plugin"
                        icon={Icon.CheckCircle}
                        onAction={() => handleEnable(`${plugin.name}@${plugin.marketplace}`, plugin.installStatus!.scope!)}
                      />
                    )}
                    <Action
                      title="Uninstall Plugin"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleUninstall(`${plugin.name}@${plugin.marketplace}`, plugin.installStatus!.scope!)}
                      shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    />
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
                    <Action.OpenInBrowser title="Open Repository" icon={Icon.Globe} url={plugin.repositoryUrl} />
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Install Command"
                    content={`claude plugin install ${plugin.name}@${plugin.marketplace}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Plugin ID"
                    content={`${plugin.name}@${plugin.marketplace}`}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
