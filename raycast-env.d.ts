/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
  /** Preferences accessible in the `installed-plugins` command */
  export type InstalledPlugins = ExtensionPreferences & {}
  /** Preferences accessible in the `marketplaces` command */
  export type Marketplaces = ExtensionPreferences & {}
  /** Preferences accessible in the `validate-plugin` command */
  export type ValidatePlugin = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
  /** Arguments passed to the `installed-plugins` command */
  export type InstalledPlugins = {}
  /** Arguments passed to the `marketplaces` command */
  export type Marketplaces = {}
  /** Arguments passed to the `validate-plugin` command */
  export type ValidatePlugin = {}
}

