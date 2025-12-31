/**
 * Validate Plugin command (dev tool)
 */

import { List, ActionPanel, Action, Detail, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";
import { validatePlugin } from "./lib/claude-cli";
import { homedir } from "os";
import path from "path";

export default function ValidatePlugin() {
  const [validationResult, setValidationResult] = useState<{ success: boolean; output: string } | null>(null);

  async function handleValidate(pluginPath: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Validating plugin..." });
    try {
      const result = await validatePlugin(pluginPath);

      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Plugin is valid";
        setValidationResult({ success: true, output: result.output });
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Validation failed";
        setValidationResult({ success: false, output: result.error || "Unknown error" });
      }
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Validation failed";
      setValidationResult({ success: false, output: error.message });
    }
  }

  if (validationResult) {
    const markdown = `
# Validation Result

${validationResult.success ? "✅ **Plugin is valid**" : "❌ **Validation failed**"}

## Output

\`\`\`
${validationResult.output}
\`\`\`
    `;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Validate Another" icon={Icon.ArrowLeft} onAction={() => setValidationResult(null)} />
            <Action.CopyToClipboard title="Copy Output" content={validationResult.output} />
          </ActionPanel>
        }
      />
    );
  }

  // Common plugin directories
  const commonPaths = [
    {
      name: "User Plugins",
      path: path.join(homedir(), ".claude", "plugins", "user"),
    },
    {
      name: "Project Plugins",
      path: path.join(process.cwd(), ".claude", "plugins"),
    },
    {
      name: "Current Directory",
      path: process.cwd(),
    },
  ];

  return (
    <List searchBarPlaceholder="Enter plugin directory path...">
      <List.Section title="Common Locations">
        {commonPaths.map((item) => (
          <List.Item
            key={item.path}
            title={item.name}
            subtitle={item.path}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action title="Validate" icon={Icon.CheckCircle} onAction={() => handleValidate(item.path)} />
                <Action.CopyToClipboard title="Copy Path" content={item.path} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Instructions">
        <List.Item
          title="How to Validate"
          subtitle="Select a directory above or use the custom path option"
          icon={Icon.QuestionMarkCircle}
          actions={
            <ActionPanel>
              <Action.Push
                title="Custom Path"
                icon={Icon.Pencil}
                target={<CustomPathForm onValidate={handleValidate} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function CustomPathForm({ onValidate }: { onValidate: (path: string) => void }) {
  const [pluginPath, setPluginPath] = useState("");

  return (
    <List searchBarPlaceholder="Enter custom plugin directory path...">
      <List.Item
        title="Validate Custom Path"
        subtitle={pluginPath || "Enter path in search bar"}
        icon={Icon.Folder}
        actions={
          <ActionPanel>
            <Action
              title="Validate Path"
              icon={Icon.CheckCircle}
              onAction={() => {
                if (pluginPath) {
                  onValidate(pluginPath);
                }
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title={pluginPath || "Type the path above"}
        icon={Icon.Info}
        actions={
          <ActionPanel>
            <Action title="Enter Path" onAction={() => {}} />
          </ActionPanel>
        }
      />
    </List>
  );
}
