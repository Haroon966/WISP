import { create } from "zustand";
import type { SshProfile } from "@/types/ssh";
import { buildSshCommand } from "@/lib/ssh";
import { useTabStore } from "@/stores/useTabStore";

const STORAGE_KEY = "wisp-ssh-profiles";

function loadProfiles(): SshProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProfiles(profiles: SshProfile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

interface SshStore {
  profiles: SshProfile[];
  addProfile: (profile: Omit<SshProfile, "id">) => SshProfile;
  updateProfile: (id: string, partial: Partial<Omit<SshProfile, "id">>) => void;
  removeProfile: (id: string) => void;
  connect: (id: string) => void;
}

export const useSshStore = create<SshStore>((set, get) => ({
  profiles: loadProfiles(),

  addProfile: (profile) => {
    const entry: SshProfile = { ...profile, id: crypto.randomUUID() };
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

  connect: (id) => {
    const profile = get().profiles.find((p) => p.id === id);
    if (!profile) return;
    const cmd = buildSshCommand(profile);
    useTabStore.getState().addTab(`SSH: ${profile.name}`, "~", {
      initialCommand: cmd,
      sshHost: profile.host,
    });
  },
}));
