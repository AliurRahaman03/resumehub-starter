"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabase";

const ROLES = [
  "Software Developer", "Web Developer", "IT Support", "Data Analyst",
  "Cybersecurity", "Cloud / DevOps", "Office Assistant", "Accountant",
  "Customer Support", "Other"
];
type Resume = {
  id: string;
  user_id: string;
  candidate_name: string;
  job_role: string;
  file_name: string;
  storage_path: string;
  created_at: string;
};

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [candidate, setCandidate] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [filterRole, setFilterRole] = useState("All roles");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!supabaseConfigured) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) void loadResumes();
    else setResumes([]);
    // load on authenticated-user changes only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  async function loadResumes() {
    const { data, error } = await supabase.from("resumes").select("*").order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setResumes((data ?? []) as Resume[]);
  }

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setAuthBusy(true);
    try {
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setMessage("Account created. Check your email to confirm it, then sign in.");
      } else {
        setMessage(mode === "signup" ? "Account created." : "Signed in.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!session?.user || !file) { setMessage("Choose a PDF file first."); return; }
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      setMessage("Only PDF files are allowed."); return;
    }
    if (file.size > 10 * 1024 * 1024) { setMessage("Maximum file size is 10 MB."); return; }
    setUploadBusy(true);
    setMessage("");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
    try {
      const { error: storageError } = await supabase.storage.from("resumes").upload(path, file, {
        contentType: "application/pdf", upsert: false
      });
      if (storageError) throw storageError;
      const { error: rowError } = await supabase.from("resumes").insert({
        user_id: session.user.id,
        candidate_name: candidate.trim() || file.name.replace(/\.pdf$/i, ""),
        job_role: role,
        file_name: file.name,
        storage_path: path
      });
      if (rowError) {
        await supabase.storage.from("resumes").remove([path]);
        throw rowError;
      }
      setCandidate("");
      setFile(null);
      const input = document.getElementById("resume-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setMessage("Resume uploaded.");
      await loadResumes();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadBusy(false);
    }
  }

  async function openResume(item: Resume) {
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(item.storage_path, 60);
    if (error) setMessage(error.message);
    else if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteResume(item: Resume) {
    if (!window.confirm(`Delete ${item.file_name}? This cannot be undone.`)) return;
    setMessage("");
    const { error: storageError } = await supabase.storage.from("resumes").remove([item.storage_path]);
    if (storageError) { setMessage(storageError.message); return; }
    const { error } = await supabase.from("resumes").delete().eq("id", item.id);
    if (error) setMessage(error.message);
    else { setMessage("Resume deleted."); await loadResumes(); }
  }

  const visible = useMemo(() => resumes.filter((r) => {
    const roleMatch = filterRole === "All roles" || r.job_role === filterRole;
    const term = search.trim().toLowerCase();
    return roleMatch && (!term || r.candidate_name.toLowerCase().includes(term) || r.file_name.toLowerCase().includes(term));
  }), [resumes, filterRole, search]);

  if (!ready) return <main className="shell"><p className="muted">Loading ResumeHub…</p></main>;

  return (
    <main className="shell">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 text-sm font-bold uppercase tracking-[.18em] text-blue-700">Private workspace</div>
          <h1 className="text-4xl font-extrabold tracking-tight">ResumeHub</h1>
          <p className="mt-2 muted">Keep every resume organized by job role.</p>
        </div>
        {session && <button className="secondary" onClick={async () => { await supabase.auth.signOut(); setMessage("Signed out."); }}>Sign out</button>}
      </header>

      {!supabaseConfigured && <div className="panel mb-6 border-amber-300 bg-amber-50 text-amber-950">
        <strong>Setup required:</strong> Add your Supabase URL and anon/publishable key to <code>.env.local</code>, then restart the dev server.
      </div>}

      {message && <div role="status" className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</div>}

      {!session ? (
        <section className="panel mx-auto max-w-md">
          <h2 className="text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-1 mb-6 text-sm muted">Sign in to access your private resume library.</p>
          <form className="space-y-4" onSubmit={handleAuth}>
            <label className="block text-sm font-semibold">Email
              <input className="field mt-2" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <label className="block text-sm font-semibold">Password
              <input className="field mt-2" type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </label>
            <button className="primary w-full" disabled={authBusy}>{authBusy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
          </form>
          <p className="mt-5 text-center text-sm muted">
            {mode === "signin" ? "New here? " : "Already have an account? "}
            <button className="font-bold text-blue-700 underline" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </section>
      ) : (
        <>
          <section className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="panel"><p className="text-sm muted">Total resumes</p><p className="mt-2 text-3xl font-extrabold">{resumes.length}</p></div>
            <div className="panel"><p className="text-sm muted">Job roles</p><p className="mt-2 text-3xl font-extrabold">{new Set(resumes.map(r => r.job_role)).size}</p></div>
            <div className="panel"><p className="text-sm muted">Filtered results</p><p className="mt-2 text-3xl font-extrabold">{visible.length}</p></div>
          </section>

          <section className="panel mb-6">
            <h2 className="mb-1 text-xl font-bold">Add a resume</h2>
            <p className="mb-5 text-sm muted">PDF only · maximum 10 MB per file</p>
            <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold">Candidate / resume label
                <input className="field mt-2" value={candidate} onChange={e => setCandidate(e.target.value)} placeholder="e.g. Rahul Sharma" maxLength={100} />
              </label>
              <label className="block text-sm font-semibold">Job role
                <select className="field mt-2" value={role} onChange={e => setRole(e.target.value)}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold md:col-span-2">PDF file
                <input id="resume-file" className="field mt-2" type="file" accept="application/pdf,.pdf" required onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <div className="md:col-span-2"><button className="primary" disabled={uploadBusy}>{uploadBusy ? "Uploading…" : "Upload resume"}</button></div>
            </form>
          </section>

          <section className="panel">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div><h2 className="text-xl font-bold">Your resumes</h2><p className="mt-1 text-sm muted">Only your account can access these files.</p></div>
              <button className="secondary" onClick={() => void loadResumes()}>Refresh</button>
            </div>
            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_240px]">
              <input className="field" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidate or filename…" aria-label="Search resumes" />
              <select className="field" value={filterRole} onChange={e => setFilterRole(e.target.value)} aria-label="Filter by job role">
                <option>All roles</option>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            {visible.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center">
                <p className="font-semibold">No resumes found</p><p className="mt-1 text-sm muted">Upload a PDF or change your search filters.</p>
              </div>
            ) : <div className="divide-y divide-slate-100">
              {visible.map(item => <article key={item.id} className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-xl bg-red-50 p-3 text-sm font-extrabold text-red-700">PDF</div>
                  <div className="min-w-0"><h3 className="truncate font-bold">{item.candidate_name}</h3><p className="mt-1 truncate text-sm muted">{item.file_name}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{item.job_role}</span><span className="text-xs muted">{new Date(item.created_at).toLocaleDateString()}</span></div></div>
                </div>
                <div className="flex shrink-0 gap-2"><button className="secondary" onClick={() => void openResume(item)}>Open PDF</button><button className="danger" onClick={() => void deleteResume(item)}>Delete</button></div>
              </article>)}
            </div>}
          </section>
        </>
      )}
      <footer className="mt-8 text-center text-xs muted">ResumeHub · Private by default · Do not upload files you do not have permission to store.</footer>
    </main>
  );
}