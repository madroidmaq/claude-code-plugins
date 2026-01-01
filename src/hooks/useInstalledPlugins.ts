/**
 * React hook for fetching and managing installed plugin data
 */

import { useState, useEffect, useCallback } from "react";
import { getInstalledPlugins } from "../lib/claude-cli";
import {
  getCachedData,
  CACHE_KEYS,
  invalidateCache,
} from "../lib/cache-manager";
import { InstalledPlugin } from "../lib/types";

export function useInstalledPlugins() {
  const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlugins = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCachedData(
        CACHE_KEYS.INSTALLED_PLUGINS,
        getInstalledPlugins,
      );
      setPlugins(data);
    } catch (err) {
      setError(err as Error);
      setPlugins([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const refetch = useCallback(() => {
    invalidateCache(CACHE_KEYS.INSTALLED_PLUGINS);
    fetchPlugins();
  }, [fetchPlugins]);

  return { plugins, isLoading, error, refetch };
}
