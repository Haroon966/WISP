import { create } from "zustand";
import type { CommandSnippet } from "@/types/snippet";

const STORAGE_KEY = "wisp-snippets";

function loadSnippets(): CommandSnippet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSnippets(snippets: CommandSnippet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
}

interface SnippetStore {
  snippets: CommandSnippet[];
  addSnippet: (snippet: Omit<CommandSnippet, "id">) => CommandSnippet;
  updateSnippet: (id: string, partial: Partial<Omit<CommandSnippet, "id">>) => void;
  removeSnippet: (id: string) => void;
}

export const useSnippetStore = create<SnippetStore>((set, get) => ({
  snippets: loadSnippets(),

  addSnippet: (snippet) => {
    const entry: CommandSnippet = { ...snippet, id: crypto.randomUUID() };
    const snippets = [...get().snippets, entry];
    saveSnippets(snippets);
    set({ snippets });
    return entry;
  },

  updateSnippet: (id, partial) => {
    const snippets = get().snippets.map((s) =>
      s.id === id ? { ...s, ...partial } : s,
    );
    saveSnippets(snippets);
    set({ snippets });
  },

  removeSnippet: (id) => {
    const snippets = get().snippets.filter((s) => s.id !== id);
    saveSnippets(snippets);
    set({ snippets });
  },
}));
