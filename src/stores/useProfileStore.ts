import { create } from "zustand";
import type { ShellProfile } from "@/types/profile";
import { useTabStore } from "@/stores/useTabStore";

const STORAGE_KEY = "wisp-shell-profiles";

function loadProfiles(): ShellProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProfiles(profiles: ShellProfile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

interface ProfileStore {
  profiles: ShellProfile[];
  addProfile: (profile: Omit<ShellProfile, "id">) => ShellProfile;
  updateProfile: (id: string, partial: Partial<Omit<ShellProfile, "id">>) => void;
  removeProfile: (id: string) => void;
  openProfile: (id: string) => void;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profiles: loadProfiles(),

  addProfile: (profile) => {
    const entry: ShellProfile = { ...profile, id: crypto.randomUUID() };
    const profiles = [...get().profiles, entry];
    saveProfiles(profiles);
    set({ profiles });
    return entry;
  },

  updateProfile: (id, partial) => {
    const profiles = get().profiles.map((p) =>
      p.id === id ? { ...p, ...partial } : p,
    );
    saveProfiles(profiles);
    set({ profiles });
  },

  removeProfile: (id) => {
    const profiles = get().profiles.filter((p) => p.id !== id);
    saveProfiles(profiles);
    set({ profiles });
  },

  openProfile: (id) => {
    const profile = get().profiles.find((p) => p.id === id);
    if (!profile) return;
    useTabStore.getState().addTab(profile.name, profile.cwd, {
      shell: profile.shell,
      env: profile.env,
      initialCommand: profile.startupCommand,
    });
  },
}));
