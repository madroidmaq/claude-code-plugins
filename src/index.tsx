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
            <List.Dropdown.Item key={m} title={m === "all" ? "All Marketplaces" : m} value={m} />
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
          // Show enabled/disabled status only
          if (plugin.installStatus.enabled !== false) {
            accessories.push({ tag: { value: "Enabled", color: Color.Green } });
          } else {
            accessories.push({ tag: { value: "Disabled", color: Color.Red } });
          }
        }

        return (
          <List.Item
            key={`${plugin.name}@${plugin.marketplace}`}
            title={plugin.name}
            accessories={accessories}
            detail={
              <List.Item.Detail
                markdown={plugin.description}
                metadata={
                  <List.Item.Detail.Metadata>
                    {/* Basic Info */}
                    <List.Item.Detail.Metadata.Label title="Version" text={plugin.version} />
                    <List.Item.Detail.Metadata.Label title="Marketplace" text={plugin.marketplace} />
                    <List.Item.Detail.Metadata.Label
                      title="Author"
                      text={`${plugin.author?.name || "Unknown"}${plugin.author?.email ? ` (${plugin.author.email})` : ""}`}
                    />

                    {/* Components */}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Components" />
                    {plugin.components.commands && plugin.components.commands.count > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Commands">
                        {plugin.components.commands.names.map((name) => (
                          <List.Item.Detail.Metadata.TagList.Item key={name} text={name} color={Color.Purple} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    {plugin.components.skills && plugin.components.skills.count > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Skills">
                        {plugin.components.skills.names.map((name) => (
                          <List.Item.Detail.Metadata.TagList.Item key={name} text={name} color={Color.Blue} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    {plugin.components.agents && plugin.components.agents.count > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Agents">
                        {plugin.components.agents.names.map((name) => (
                          <List.Item.Detail.Metadata.TagList.Item key={name} text={name} color={Color.Orange} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    {plugin.components.hooks && plugin.components.hooks.count > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Hooks">
                        {plugin.components.hooks.names.map((name) => (
                          <List.Item.Detail.Metadata.TagList.Item key={name} text={name} color={Color.Magenta} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    {plugin.components.mcp && (
                      <List.Item.Detail.Metadata.Label title="MCP Servers" text="Enabled" />
                    )}

                    {/* Installation Info */}
                    {plugin.installStatus?.installed && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Installation" />
                        <List.Item.Detail.Metadata.TagList title="Status">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={plugin.installStatus.enabled !== false ? "Enabled" : "Disabled"}
                            color={plugin.installStatus.enabled !== false ? Color.Green : Color.Red}
                          />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label title="Scope" text={plugin.installStatus.scope || "unknown"} />
                        <List.Item.Detail.Metadata.Label
                          title="Install Path"
                          text={plugin.installStatus.installPath || "unknown"}
                        />
                        {plugin.installStatus.version && (
                          <List.Item.Detail.Metadata.Label title="Installed Version" text={plugin.installStatus.version} />
                        )}
                      </>
                    )}

                    {/* Repository Link */}
                    {plugin.repositoryUrl && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Link title="Repository" target={plugin.repositoryUrl} text="View on GitHub" />
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
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
                    title="Copy Plugin ID"
                    content={`${plugin.name}@${plugin.marketplace}`}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  {plugin.installStatus?.installed && plugin.installStatus.installPath && (
                    <Action.CopyToClipboard
                      title="Copy Install Path"
                      content={plugin.installStatus.installPath}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Install Command"
                    content={`claude plugin install ${plugin.name}@${plugin.marketplace}`}
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
