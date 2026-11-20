"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { FOCUS } from "./ui";

const MAX = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Errors {
  name?: string;
  email?: string;
  message?: string;
}

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [serverError, setServerError] = useState("");

  function validate(): Errors {
    const e: Errors = {};
    if (!name.trim()) e.name = "Enter your name.";
    if (!email.trim()) e.email = "Enter your email address.";
    else if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email address.";
    if (message.trim().length < 10) e.message = "Write at least 10 characters.";
    else if (message.length > MAX) e.message = `Keep the message under ${MAX} characters.`;
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (status === "sending") return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    if (website) {
      // honeypot filled: pretend success, send nothing
      setStatus("sent");
      return;
    }
    setStatus("sending");
    setServerError("");
    try {
      await api.contact(name.trim(), email.trim(), message.trim());
      setStatus("sent");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-6 dark:border-green-800 dark:bg-green-950">
        <h2 className="text-lg font-semibold text-green-900 dark:text-green-200">Message sent</h2>
        <p className="mt-2 text-green-900 dark:text-green-200">Thanks, {name.trim() || "we"} got it. We will reply to the email address you gave.</p>
      </div>
    );
  }

  const label = "block text-sm font-medium text-slate-900 dark:text-slate-100";
  const err = "mt-1 text-sm text-red-700 dark:text-red-400";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="c-name" className={label}>Name</label>
        <input id="c-name" name="name" autoComplete="name" className={`field mt-1 ${FOCUS}`} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "c-name-err" : undefined} maxLength={120} />
        {errors.name && <p id="c-name-err" className={err}>{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="c-email" className={label}>Email</label>
        <input id="c-email" name="email" type="email" autoComplete="email" className={`field mt-1 ${FOCUS}`} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "c-email-err" : undefined} maxLength={254} />
        {errors.email && <p id="c-email-err" className={err}>{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="c-message" className={label}>Message</label>
        <textarea id="c-message" name="message" rows={6} className={`field mt-1 ${FOCUS}`} value={message} onChange={(e) => setMessage(e.target.value)} aria-invalid={!!errors.message} aria-describedby={`c-count${errors.message ? " c-message-err" : ""}`} />
        <div className="mt-1 flex justify-between gap-4">
          <div>{errors.message && <p id="c-message-err" className={err}>{errors.message}</p>}</div>
          <p id="c-count" className={`text-sm ${message.length > MAX ? "text-red-700 dark:text-red-400" : "text-slate-600 dark:text-slate-400"}`}>
            {message.length} / {MAX}
          </p>
        </div>
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <div aria-live="polite">
        {status === "error" && (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {serverError}
          </p>
        )}
      </div>

      <button type="submit" disabled={status === "sending"} className={`inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-60 ${FOCUS}`}>
        {status === "sending" ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
