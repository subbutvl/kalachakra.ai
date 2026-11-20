import type { PersonInput, ProfileResult } from "@kalachakra/engine";
import type { ReportDocument } from "@kalachakra/report";

/** The API runs on this computer (apps/api). The web app talks to it only over HTTP. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export interface ApiErrorBody {
  error: { code: string; field?: string; message: string };
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

async function post(path: string, body: unknown): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("offline", "The KalaChakra API is not reachable. Is `pnpm dev` running?");
  }
  if (!res.ok) {
    const e = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      e?.error.code ?? "http_error",
      e?.error.message ?? `Request failed (${res.status})`,
      e?.error.field,
    );
  }
  return res;
}

export interface ReportModulesInput {
  mobile?: { numbers: string[]; goals?: string[] };
  vehicle?: { registrations: string[] };
  house?: { flat?: string; building?: string; door?: string };
  business?: {
    names: string[];
    partners?: PersonInput[];
    trade?: string;
    incorporation_date?: string;
  };
  compatibility?: {
    partner: PersonInput;
    relationship: "couple" | "business_partners" | "parent_child";
  };
}

export interface ReportRequest {
  person: PersonInput;
  audience: "adult" | "child";
  language: "en" | "ta";
  modules?: ReportModulesInput;
  /** Practitioner mode: a profile id or an inline custom profile. */
  rule_profile?: unknown;
  branding?: Record<string, string>;
  overlay?: Record<string, unknown>;
}

export interface ReportSummary {
  title: string;
  file_name: string;
  sections: { id: string; number: number; title: string; part: string }[];
  meta: { engine: string; rules: string; texts: string; input_hash: string };
}

export const api = {
  profile: async (person: PersonInput): Promise<ProfileResult> =>
    (
      await post("/v1/profile", { person, options: { name_suggestions: 0 } })
    ).json() as Promise<ProfileResult>,
  report: async (req: ReportRequest): Promise<ReportSummary> =>
    (await post("/v1/report", req)).json() as Promise<ReportSummary>,
  reportDocument: async (req: ReportRequest): Promise<ReportDocument> =>
    (await post("/v1/report", req)).json() as Promise<ReportDocument>,
  reportHtml: async (req: ReportRequest): Promise<string> =>
    (await post("/v1/report/html", req)).text(),
  reportPdf: async (req: ReportRequest): Promise<Blob> =>
    (await post("/v1/report/pdf", req)).blob(),
};
