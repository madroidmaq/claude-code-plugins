/**
 * Browse Claude Plugins - Main command
 */

import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useState } from "react";
import { usePlugins } from "./hooks/usePlugins";
import PluginDetails from "./plugin-details";
import { ErrorView } from "./components/ErrorView";

export default function BrowsePlugins() {
  const { plugins, isLoading, error } = usePlugins();
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

  return (
    <List
      isLoading={isLoading}
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
        const accessories: List.Item.Accessory[] = [
          { text: plugin.version },
          { text: plugin.marketplace, tooltip: "Marketplace" },
        ];

        if (plugin.installStatus?.installed) {
          accessories.push({ tag: { value: "Installed", color: Color.Green } });
        }

        return (
          <List.Item
            key={`${plugin.name}@${plugin.marketplace}`}
            title={plugin.name}
            subtitle={plugin.description}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push title="View Details" icon={Icon.Eye} target={<PluginDetails plugin={plugin} />} />
                {plugin.repositoryUrl && (
                  <Action.OpenInBrowser title="Open Repository" icon={Icon.Globe} url={plugin.repositoryUrl} />
                )}
                <Action.CopyToClipboard
                  title="Copy Plugin ID"
                  content={`${plugin.name}@${plugin.marketplace}`}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
