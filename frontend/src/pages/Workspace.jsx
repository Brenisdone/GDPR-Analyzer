import { useCallback, useEffect, useState } from "react";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Globe,
  History,
  LayoutDashboard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import AssessmentDetails from "../components/AssessmentDetails";
import { apiRequest } from "../utils/api";
import {
  displayTarget,
  getFindings,
  getModules,
  gradeStyle,
} from "../utils/scan";

export default function Workspace() {
  const [url, setUrl] = useState("");
  const [scan, setScan] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState("overview");

  const loadHistory = useCallback(async () => {
    const data = await apiRequest("/api/scans");
    setScans(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryTimer;

    async function initialize() {
      try {
        await apiRequest("/api/health");
      } catch (error) {
        if (cancelled) return;

        setApiOnline(false);
        setError("Backend is starting. Retrying automatically...");
        console.error("[Backend] Not available yet:", error);

        retryTimer = window.setTimeout(initialize, 1500);
        return;
      }

      if (cancelled) return;

      setApiOnline(true);
      setError("");
      console.log("[Backend] Connected successfully.");

      try {
        await loadHistory();
      } catch (error) {
        if (cancelled) return;

        console.error("[Frontend] Failed to load scan history:", error);
        setError("Connected to the backend, but failed to load scan history.");
      }
    }

    initialize();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
    };
  }, [loadHistory]);

  async function handleScan(event) {
    event.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setError("");
    setPage("overview");

    try {
      const data = await apiRequest("/api/scans", {
        method: "POST",
        body: JSON.stringify({ target: url.trim() }),
      });

      setScan(data);
      setUrl("");
      setApiOnline(true);
      await loadHistory();
    } catch (err) {
      setError(err.message || "The scan failed.");
    } finally {
      setLoading(false);
    }
  }

  async function openScan(id) {
    setError("");

    try {
      const data = await apiRequest(`/api/scans/${id}`);
      setScan(data);
      setPage("overview");
    } catch (err) {
      setError(err.message || "Could not load this scan.");
    }
  }

  async function refreshHistory() {
    setError("");

    try {
      await loadHistory();
    } catch (err) {
      setError(err.message || "Could not refresh scan history.");
    }
  }

  const modules = getModules(scan?.result);
  const findings = getFindings(scan?.result);
  const grade = scan?.grade || "—";
  const isCompleted = scan?.status === "completed";

  const navButton = (id) =>
    `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
      page === id
        ? "bg-cyan-400/10 text-cyan-200"
        : "text-slate-400 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-14 z-20 hidden w-64 border-r border-white/[0.07] bg-[#0b1120] p-6 md:flex md:flex-col">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-300">
            <ShieldCheck size={25} />
          </div>
          <div>
            <h1 className="font-semibold tracking-tight">PrivacyLens</h1>
            <p className="text-xs text-slate-500">GDPR Analyzer</p>
          </div>
        </div>

        <p className="mb-3 mt-12 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          Workspace
        </p>

        <nav className="space-y-2">
          <button onClick={() => setPage("overview")} className={navButton("overview")}>
            <LayoutDashboard size={18} />
            Overview
          </button>

          <button onClick={() => setPage("history")} className={navButton("history")}>
            <History size={18} />
            Scan history
            <span className="ml-auto rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-400">
              {scans.length}
            </span>
          </button>
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <span
              className={`h-2 w-2 rounded-full ${
                apiOnline ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            API connection
          </div>
          <p className="text-xs leading-5 text-slate-500">
            {apiOnline
              ? "FastAPI backend is responding."
              : "Backend connection unavailable."}
          </p>
          <p className="mt-3 text-[10px] text-slate-600">Development environment</p>
        </div>
      </aside>

      <main className="min-h-[calc(100vh-3.5rem)] md:ml-64">
        <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-5 sm:px-8 lg:px-10">
          <div>
            <p className="text-xs text-slate-500">WORKSPACE / PRIVACY</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {page === "history" ? "Scan history" : "Website overview"}
            </h2>
          </div>

          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
              apiOnline
                ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300"
                : "border-rose-400/20 bg-rose-400/[0.06] text-rose-300"
            }`}
          >
            <Activity size={14} />
            {apiOnline ? "System online" : "System offline"}
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-7 p-5 sm:p-8 lg:p-10">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div className="flex-1">{error}</div>
              <button
                onClick={() => setError("")}
                className="text-rose-300 hover:text-white"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {page === "overview" ? (
            <>
              <section>
                <p className="text-sm text-cyan-300">WEBSITE ASSESSMENT</p>
                <h3 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Understand your website&apos;s{" "}
                  <span className="text-slate-500">privacy posture.</span>
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  Analyze cookie behavior, potential tracking beacons, and
                  transmission-security indicators from one place.
                </p>
              </section>

              <section className="rounded-2xl border border-white/[0.09] bg-[#0e1627] p-5 sm:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-300">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium">Analyze a website</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Enter a publicly accessible website URL to begin.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleScan} className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-[#080d18] px-4 focus-within:border-cyan-400/50">
                    <Globe size={17} className="shrink-0 text-slate-500" />
                    <input
                      type="url"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://example.com"
                      aria-label="Website URL"
                      required
                      disabled={loading}
                      className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-slate-600 disabled:opacity-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !url.trim()}
                    className="flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <LoaderCircle className="animate-spin" size={17} />
                        Scanning...
                      </>
                    ) : (
                      <>
                        Start scan <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </form>

                {loading && (
                  <p className="mt-4 text-xs text-cyan-200/80">
                    The analyzer is running. Keep this page open until the
                    scan completes.
                  </p>
                )}
              </section>

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                  <p className="text-xs text-slate-500">Latest assessment</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-3xl font-semibold">{grade}</span>
                    <span className={`rounded-lg border px-2.5 py-1 text-xs ${gradeStyle(grade)}`}>
                      {isCompleted ? "Completed" : scan ? scan.status : "No scan"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {scan ? displayTarget(scan.target) : "Your latest result"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                  <p className="text-xs text-slate-500">Scans recorded</p>
                  <p className="mt-3 text-3xl font-semibold">{scans.length}</p>
                  <p className="mt-2 text-xs text-slate-500">Stored in your local database</p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                  <p className="text-xs text-slate-500">Analysis modules</p>
                  <p className="mt-3 text-3xl font-semibold">{modules.length || "—"}</p>
                  <p className="mt-2 text-xs text-slate-500">Modules exposing a grade or score</p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                  <p className="text-xs text-slate-500">Recorded findings</p>
                  <p className="mt-3 text-3xl font-semibold">{scan ? findings.length : "—"}</p>
                  <p className="mt-2 text-xs text-slate-500">Items available in structured output</p>
                </div>
              </section>

              {scan?.result && <AssessmentDetails result={scan.result} />}

              {scan && (
                <section className="rounded-2xl border border-white/[0.07] bg-[#0e1627] p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Scan details</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Scan #{scan.id} · {displayTarget(scan.target)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock3 size={14} />
                        {scan.created_at
                          ? new Date(scan.created_at).toLocaleString()
                          : "Timestamp unavailable"}
                      </span>

                      <button
                        onClick={() => {
                          window.location.href = `/api/scans/${scan.id}/report.json`;
                        }}
                        disabled={!isCompleted}
                        className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Download JSON
                      </button>
                      <button
                        onClick={() => {
                          window.location.href = `/api/scans/${scan.id}/report.pdf`;
                        }}
                        disabled={!isCompleted}
                        className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>

                  <details className="mt-5">
                    <summary className="cursor-pointer text-sm text-cyan-200 hover:text-cyan-100">
                      View raw scan JSON
                    </summary>
                    <pre className="mt-4 max-h-[500px] overflow-auto rounded-xl bg-[#080d18] p-4 text-xs leading-6 text-slate-300">
                      {JSON.stringify(scan.result, null, 2)}
                    </pre>
                  </details>
                </section>
              )}
            </>
          ) : (
            <section className="rounded-2xl border border-white/[0.07] bg-[#0e1627] p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Previous scans</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Select a scan to reopen its saved results.
                  </p>
                </div>
                <button
                  onClick={refreshHistory}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                >
                  <RefreshCw size={15} />
                  Refresh
                </button>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[550px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-xs text-slate-500">
                      <th className="pb-4 pr-4 font-medium">Website</th>
                      <th className="pb-4 pr-4 font-medium">Date</th>
                      <th className="pb-4 pr-4 font-medium">Status</th>
                      <th className="pb-4 pr-4 font-medium">Grade</th>
                      <th className="pb-4 text-right font-medium">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scans.map((item) => (
                      <tr key={item.id} className="border-b border-white/[0.05] last:border-0">
                        <td className="max-w-[220px] py-4 pr-4">
                          <p className="break-all font-medium">{displayTarget(item.target)}</p>
                          <p className="mt-1 text-xs text-slate-600">Scan #{item.id}</p>
                        </td>
                        <td className="whitespace-nowrap py-4 pr-4 text-xs text-slate-400">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : "—"}
                        </td>
                        <td className="py-4 pr-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                            {item.status === "completed" ? (
                              <CheckCircle2 size={14} className="text-emerald-300" />
                            ) : (
                              <AlertCircle size={14} className="text-amber-300" />
                            )}
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`rounded-md border px-2 py-1 text-xs ${gradeStyle(item.grade)}`}>
                            {item.grade || "—"}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => openScan(item.id)}
                            className="inline-flex items-center gap-1 text-xs text-cyan-200 hover:text-white"
                          >
                            View <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {scans.length === 0 && (
                  <div className="py-14 text-center">
                    <History className="mx-auto text-slate-600" size={28} />
                    <p className="mt-3 text-sm text-slate-300">No saved scans yet.</p>
                    <button
                      onClick={() => setPage("overview")}
                      className="mt-4 text-sm text-cyan-200 hover:text-white"
                    >
                      Start your first scan
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5 text-xs text-slate-600">
            <span>PrivacyLens · GDPR Analyzer</span>
            <span>Technical indicators, not a legal compliance certification.</span>
          </footer>
        </div>
      </main>
    </>
  );
}