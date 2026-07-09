import { getGitBranch } from "@/lib/fs";
import { useTabStore } from "@/stores/useTabStore";

export async function syncPaneGitBranch(
  tabId: string,
  paneId: string,
  cwd: string | undefined,
) {
  if (!cwd) return;
  const branch = await getGitBranch(cwd).catch(() => null);
  useTabStore.getState().setPaneBranch(tabId, paneId, branch);
}
