"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PersonInput } from "@kalachakra/engine";
import type { ProfileChoice } from "@/lib/engine";

/**
 * Practitioner simulation state, kept in this browser (localStorage) only
 * (phase 1 spec 6). Export and import move it between computers.
 */
export interface Branding {
  name: string;
  title: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  signature: string;
}

export type OverlayEdit =
  | { action: "replace"; section: string; block: string; text: string }
  | { action: "add_note"; section: string; after?: string; text: string }
  | { action: "hide"; section: string; block?: string };

export interface ClientReport {
  id: string;
  created: string;
  audience: "adult" | "child";
  language: "en" | "ta";
  status: "draft" | "reviewed" | "ready";
  order: string[];
  edits: OverlayEdit[];
}

export interface Client {
  id: string;
  person: PersonInput;
  notes: string;
  mobiles: string[];
  created: string;
  reports: ClientReport[];
}

interface PractitionerState {
  settings: Branding & { defaultProfile: string };
  profile: ProfileChoice;
  clients: Client[];
  setSettings: (s: Partial<PractitionerState["settings"]>) => void;
  setProfile: (p: ProfileChoice) => void;
  saveClient: (c: Client) => void;
  removeClient: (id: string) => void;
  duplicateClient: (id: string) => void;
  importAll: (data: unknown) => string | undefined;
  saveReport: (clientId: string, r: ClientReport) => void;
}

export const newId = () => Math.random().toString(36).slice(2, 10);

export const usePractitioner = create<PractitionerState>()(
  persist(
    (set, get) => ({
      settings: {
        name: "",
        title: "",
        phone: "",
        email: "",
        website: "",
        logo: "",
        signature: "",
        defaultProfile: "house-default",
      },
      profile: { kind: "id", id: "house-default" },
      clients: [],
      setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
      setProfile: (profile) => set({ profile }),
      saveClient: (c) =>
        set((st) => ({
          clients: st.clients.some((x) => x.id === c.id)
            ? st.clients.map((x) => (x.id === c.id ? c : x))
            : [...st.clients, c],
        })),
      removeClient: (id) => set((st) => ({ clients: st.clients.filter((c) => c.id !== id) })),
      duplicateClient: (id) => {
        const c = get().clients.find((x) => x.id === id);
        if (!c) return;
        set((st) => ({
          clients: [
            ...st.clients,
            {
              ...c,
              id: newId(),
              person: { ...c.person, name: `${c.person.name} (copy)` },
              reports: [],
              created: new Date().toISOString(),
            },
          ],
        }));
      },
      importAll: (data) => {
        const d = data as { clients?: unknown; settings?: unknown };
        if (!d || !Array.isArray(d.clients)) return "This file has no client list.";
        const clients = (d.clients as Client[]).filter(
          (c) =>
            c &&
            typeof c.id === "string" &&
            c.person &&
            typeof c.person.name === "string" &&
            typeof c.person.dob === "string",
        );
        set((st) => ({
          clients: [
            ...st.clients.filter((c) => !clients.some((x) => x.id === c.id)),
            ...clients.map((c) => ({
              ...c,
              reports: c.reports ?? [],
              mobiles: c.mobiles ?? [],
              notes: c.notes ?? "",
            })),
          ],
          ...(d.settings && typeof d.settings === "object"
            ? { settings: { ...st.settings, ...(d.settings as object) } }
            : {}),
        }));
        return undefined;
      },
      saveReport: (clientId, r) =>
        set((st) => ({
          clients: st.clients.map((c) =>
            c.id !== clientId
              ? c
              : {
                  ...c,
                  reports: c.reports.some((x) => x.id === r.id)
                    ? c.reports.map((x) => (x.id === r.id ? r : x))
                    : [...c.reports, r],
                },
          ),
        })),
    }),
    { name: "kalachakra-practitioner", storage: createJSONStorage(() => localStorage) },
  ),
);
