/**
 * Manage Installed Plugins command
 */

import { List, ActionPanel, Action, Icon, confirmAlert, Toast, showToast, Color, Alert } from "@raycast/api";
import { useInstalledPlugins } from "./hooks/useInstalledPlugins";
import { uninstallPlugin, updatePlugin, enablePlugin, disablePlugin, openInFinder, openInVSCode } from "./lib/claude-cli";
import { invalidateCache, CACHE_KEYS } from "./lib/cache-manager";
import { ErrorView } from "./components/ErrorView";

export default function InstalledPlugins() {
  const { plugins, isLoading, error, refetch } = useInstalledPlugins();

  if (error) {
    return <ErrorView error={error} />;
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
    <List isLoading={isLoading}>
      {plugins.length === 0 && !isLoading && (
        <List.EmptyView
          title="No installed plugins"
          description="Install plugins from the Browse Claude Plugins command"
          icon={Icon.Box}
        />
      )}
      {plugins.map((plugin) => {
        const pluginName = plugin.pluginId.split("@")[0];
        const accessories: List.Item.Accessory[] = [
          { text: plugin.version },
          { tag: { value: plugin.scope, color: Color.Blue } },
        ];

        if (plugin.enabled !== false) {
          accessories.push({ tag: { value: "Enabled", color: Color.Green } });
        } else {
          accessories.push({ tag: { value: "Disabled", color: Color.Red } });
        }

        return (
          <List.Item
            key={`${plugin.pluginId}-${plugin.scope}`}
            title={pluginName}
            subtitle={plugin.installPath}
            accessories={accessories}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Management">
                  <Action
                    title="Update Plugin"
                    icon={Icon.ArrowClockwise}
                    onAction={() => handleUpdate(plugin.pluginId, plugin.scope)}
                  />
                  {plugin.enabled !== false ? (
                    <Action
                      title="Disable Plugin"
                      icon={Icon.XMarkCircle}
                      onAction={() => handleDisable(plugin.pluginId, plugin.scope)}
                    />
                  ) : (
                    <Action
                      title="Enable Plugin"
                      icon={Icon.CheckCircle}
                      onAction={() => handleEnable(plugin.pluginId, plugin.scope)}
                    />
                  )}
                  <Action
                    title="Uninstall Plugin"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleUninstall(plugin.pluginId, plugin.scope)}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Development">
                  <Action title="Open in Finder" icon={Icon.Finder} onAction={() => openInFinder(plugin.installPath)} />
                  <Action title="Open in VS Code" icon={Icon.Code} onAction={() => openInVSCode(plugin.installPath)} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Plugin ID"
                    content={plugin.pluginId}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard title="Copy Install Path" content={plugin.installPath} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
