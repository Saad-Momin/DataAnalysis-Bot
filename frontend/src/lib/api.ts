import type {
  ChatResponse,
  ConnectorPayload,
  DatasetDetail,
  DatasetSummary,
  User,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 60_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, credentials: "include", signal: ctrl.signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new ApiError("The request took too long. Please try again.", 0);
    }
    throw new ApiError(`Cannot reach the server at ${API_URL}. Is the backend running?`, 0);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") msg = body.detail;
      else if (Array.isArray(body.detail)) {
        msg = body.detail
          .map((d: { msg?: string; loc?: string[] }) =>
            `${d.loc?.slice(1).join(".") ?? ""} ${d.msg ?? ""}`.trim().replace(/^Value error, /, ""),
          )
          .join("; ");
      }
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  // ---- accounts (cookie session) ----
  me: () => request<User>("/auth/me"),
  signup: (name: string, email: string, password: string) =>
    request<User>("/auth/signup", json("POST", { name, email, password })),
  login: (email: string, password: string) => request<User>("/auth/login", json("POST", { email, password })),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  forgotPassword: (email: string) =>
    request<{ message: string; dev_reset_url?: string }>("/auth/forgot-password", json("POST", { email })),
  resetPassword: (token: string, password: string) =>
    request<void>("/auth/reset-password", json("POST", { token, password })),
  updateProfile: (name: string) => request<User>("/auth/me", json("PATCH", { name })),
  changePassword: (current_password: string, new_password: string) =>
    request<void>("/auth/change-password", json("POST", { current_password, new_password })),
  deleteAccount: (password: string) => request<void>("/auth/me", json("DELETE", { password })),
  contact: (name: string, email: string, message: string) =>
    request<{ message: string }>("/contact", json("POST", { name, email, message })),

  // ---- workspace ----
  listDatasets: () => request<DatasetSummary[]>("/datasets"),
  getDataset: (id: string) => request<DatasetDetail>(`/datasets/${id}`),
  deleteDataset: (id: string) => request<void>(`/datasets/${id}`, { method: "DELETE" }),

  uploadFile: (file: File, opts: { sheet?: string; table?: string } = {}) => {
    const form = new FormData();
    form.append("file", file);
    if (opts.sheet) form.append("sheet", opts.sheet);
    if (opts.table) form.append("table", opts.table);
    return request<DatasetDetail>("/upload", { method: "POST", body: form }, 180_000);
  },

  importRemote: (payload: ConnectorPayload) =>
    request<DatasetDetail>(
      "/connectors/import",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      180_000,
    ),

  chat: (datasetId: string, message: string, conversationId: string | null) =>
    request<ChatResponse>(
      "/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset_id: datasetId, message, conversation_id: conversationId }),
      },
      150_000,
    ),
};
