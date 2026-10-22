import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  Globe,
  History,
  LayoutDashboard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body.detail || `Request failed with status ${response.status}`
    );
  }

  return body;
}

function formatName(value) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getModules(result) {
  if (!result || typeof result !== "object") return [];

  const moduleKeys = [
    "cookies",
    "web_beacons",
    "security_transmission",
  ];

  return moduleKeys
    .filter((key) => result[key] && typeof result[key] === "object")
    .map((key) => ({
      name: formatName(key),
      grade: result[key].grade ?? "—",
      score: result[key].score,
    }));
}

function getFindings(result) {
  const findings = [];
  const listKeys = /finding|url|cookie|beacon|issue|tracker/i;

  function walk(value, path = []) {
    if (!value || typeof value !== "object") return;

    for (const [key, child] of Object.entries(value)) {
      if (Array.isArray(child) && listKeys.test(key)) {
        child.forEach((item) => {
          if (item && typeof item === "object") {
            findings.push({
              section: path.concat(key).map(formatName).join(" / "),
              ...item,
            });
          } else {
            findings.push({
              section: path.concat(key).map(formatName).join(" / "),
              value: item,
            });
          }
        });
      } else if (child && typeof child === "object") {
        walk(child, path.concat(key));
      }
    }
  }

  walk(result);
  return findings;
}

function gradeStyle(grade) {
  const value = String(grade || "").toUpperCase();

  if (value === "A") return "text-emerald-300 border-emerald-400/30 bg-emerald-400/10";
  if (value === "B") return "text-lime-300 border-lime-400/30 bg-lime-400/10";
  if (value === "C") return "text-amber-300 border-amber-400/30 bg-amber-400/10";
  if (["D", "E", "F"].includes(value)) {
    return "text-rose-300 border-rose-400/30 bg-rose-400/10";
  }

  return "text-slate-300 border-slate-700 bg-slate-800";
}

function displayTarget(target = "") {
  return target.replace(/^https?:\/\//, "").replace(/\/$/, "");
}


function AssessmentDetails({ result }) {
  if (!result) {
    return <p className="text-sm text-slate-400">No assessment result available.</p>;
  }

  const modules = [
    {
      key: "cookies",
      title: "Cookie Analysis",
      description: "Cookie-related information reported by the analyzer.",
    },
    {
      key: "web_beacons",
      title: "Web Beacon Detection",
      description: "URLs reported as potential web beacons.",
    },
    {
      key: "security_transmission",
      title: "Transmission Security",
      description: "TLS protocols, cipher suites, key and certificate details.",
    },
  ];

  const security = result.security_transmission;

  const protocols = security?.protocol
    ? Object.entries(security.protocol).filter(
        ([key, value]) =>
          key !== "score" && typeof value !== "object"
      )
    : [];

  const cipherGroups = security?.cipher
    ? Object.entries(security.cipher).filter(
        ([key, value]) => key !== "score" && Array.isArray(value)
      )
    : [];

  const cipherCount = cipherGroups.reduce(
    (total, [, suites]) => total + suites.length,
    0
  );

  const recommendedCount = cipherGroups.reduce(
    (total, [, suites]) =>
      total +
      suites.filter((suite) =>
        Object.values(suite).some(
          (details) => details?.security === "recommended"
        )
      ).length,
    0
  );

  const certificate = security?.certificate;
  const keyInfo = security?.key;
  const securityScores = [
    {
      label: "Protocol score",
      value: security?.protocol?.score,
    },
    {
      label: "Key score",
      value: security?.key?.score,
    },
    {
      label: "Cipher score",
      value: security?.cipher?.score,
    },
    {
      label: "Certificate score",
      value: security?.certificate?.score,
    },
  ];

  const displayValue = (value) =>
    value === null || value === undefined || value === ""
      ? "Not available"
      : String(value);

  const Panel = ({ title, children }) => (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
      <h3 className="mb-3 text-lg font-semibold text-slate-100">{title}</h3>
      {children}
    </section>
  );

  const Metric = ({ label, value }) => (
    <div className="rounded-lg bg-slate-800 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 break-words font-medium text-slate-100">
        {displayValue(value)}
      </p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">
          Assessment Modules
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Module grades reflect the analyzer's scoring system, not a legal
          determination of GDPR compliance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {modules.map((module) => {
          const data = result[module.key];

          return (
            <Panel key={module.key} title={module.title}>
              {!data ? (
                <p className="text-sm text-slate-400">
                  No result returned for this module.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-slate-100">
                      {displayValue(data.grade)}
                    </span>
                    {module.key === "security_transmission" ? (
                    <span className="text-sm text-slate-400">
                      4 component scores
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">
                      Score: {displayValue(data.score)}
                    </span>
                  )}
                  </div>
                  <p className="mt-3 text-sm text-slate-400">
                    {module.description}
                  </p>
                </>
              )}
            </Panel>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Cookie Analysis">
          {!result.cookies ? (
            <p className="text-slate-400">No result available.</p>
          ) : Object.keys(result.cookies.details ?? {}).length === 0 ? (
            <p className="text-sm text-slate-400">
              No cookie details were reported in this scan result. This does
              not independently prove that the website uses no cookies.
            </p>
          ) : (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm text-slate-300">
              {JSON.stringify(result.cookies.details, null, 2)}
            </pre>
          )}
        </Panel>

        <Panel title="Web Beacon Detection">
          {!result.web_beacons ? (
            <p className="text-slate-400">No result available.</p>
          ) : (result.web_beacons.url ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">
              No beacon URLs were reported by the analyzer.
            </p>
          ) : (
            <ul className="list-inside list-disc space-y-2 text-sm text-slate-300">
              {result.web_beacons.url.map((url, index) => (
                <li key={`${url}-${index}`} className="break-all">
                  {typeof url === "string"
                    ? url
                    : JSON.stringify(url)}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Transmission Security">
        {!security ? (
          <p className="text-slate-400">No security result available.</p>
        ) : (
          <div className="space-y-5">
            <div>
              <h4 className="mb-3 font-medium text-slate-200">
                Security Component Scores
              </h4>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {securityScores.map(({ label, value }) => (
                  <Metric key={label} label={label} value={value} />
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Hostname" value={security.hostname} />
              <Metric label="Module grade" value={security.grade} />
              <Metric label="Key type" value={keyInfo?.type} />
              <Metric
                label="Key size"
                value={keyInfo?.size ? `${keyInfo.size} bits` : null}
              />
              <Metric label="Cipher suites listed" value={cipherCount} />
              <Metric
                label="Recommended suites listed"
                value={recommendedCount}
              />
              <Metric
                label="Certificate issuer"
                value={certificate?.issued_by}
              />
              <Metric
                label="Certificate algorithm"
                value={certificate?.sign_algo}
              />
            </div>

            <div>
              <h4 className="mb-2 font-medium text-slate-200">
                Protocol Results
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="p-2">Protocol</th>
                      <th className="p-2">Analyzer result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {protocols.map(([protocol, value]) => (
                      <tr key={protocol} className="border-t border-slate-700">
                        <td className="p-2 text-slate-300">{protocol}</td>
                        <td className="p-2 text-slate-100">
                          {displayValue(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Protocol labels and values are displayed as returned by the
                analyzer; their security implications should be assessed
                separately.
              </p>
            </div>

            <div>
              <h4 className="mb-2 font-medium text-slate-200">
                Certificate Details
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="Issued to" value={certificate?.issued_to} />
                <Metric label="Issued by" value={certificate?.issued_by} />
                <Metric
                  label="Valid from"
                  value={certificate?.not_before}
                />
                <Metric
                  label="Valid until"
                  value={certificate?.not_after}
                />
                <Metric
                  label="Signature algorithm"
                  value={certificate?.sign_algo}
                />
                <Metric
                  label="Certificate type"
                  value={certificate?.type}
                />
              </div>
            </div>

            <details className="rounded-lg border border-slate-700 p-3">
              <summary className="cursor-pointer font-medium text-slate-200">
                View cipher-suite details
              </summary>
              <div className="mt-3 space-y-4">
                {cipherGroups.map(([protocol, suites]) => (
                  <div key={protocol}>
                    <h5 className="mb-2 font-medium text-slate-300">
                      {protocol} ({suites.length})
                    </h5>
                    <ul className="space-y-2 text-sm text-slate-400">
                      {suites.map((suite, index) => (
                        <li
                          key={`${protocol}-${index}`}
                          className="break-words border-t border-slate-800 pt-2"
                        >
                          {Object.entries(suite).map(([name, details]) => (
                            <div key={name}>
                              <p className="text-slate-200">{name}</p>
                              <p>
                                {details?.cipher_type ?? "Unknown"}{" "}
                                {details?.cipher_key_size ?? ""} bits ·{" "}
                                {details?.cipher_mode ?? "Unknown mode"} ·{" "}
                                {details?.security ?? "Unclassified"}
                              </p>
                            </div>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </Panel>

      <details className="rounded-xl border border-slate-700 p-4">
        <summary className="cursor-pointer font-medium text-slate-200">
          View complete analyzer response
        </summary>
        <pre className="mt-3 max-h-[500px] overflow-auto whitespace-pre-wrap break-words text-xs text-slate-400">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </div>
  );
}


function App() {
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
    async function initialize() {
      try {
        await apiRequest("/api/health");
        setApiOnline(true);
        await loadHistory();
      } catch {
        setApiOnline(false);
        setError(
          "Could not connect to the API. Make sure FastAPI is running on port 8000."
        );
      }
    }

    initialize();
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

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/[0.07] bg-[#0b1120] p-6 md:flex md:flex-col">
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
          <button
            onClick={() => setPage("overview")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
              page === "overview"
                ? "bg-cyan-400/10 text-cyan-200"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <LayoutDashboard size={18} />
            Overview
          </button>

          <button
            onClick={() => setPage("history")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
              page === "history"
                ? "bg-cyan-400/10 text-cyan-200"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
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
          <p className="mt-3 text-[10px] text-slate-600">
            Development environment
          </p>
        </div>
      </aside>

      <main className="min-h-screen md:ml-64">
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

                <form
                  onSubmit={handleScan}
                  className="flex flex-col gap-3 sm:flex-row"
                >
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
                    <span className="text-3xl font-semibold">
                      {grade}
                    </span>
                    <span
                      className={`rounded-lg border px-2.5 py-1 text-xs ${gradeStyle(grade)}`}
                    >
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
                  <p className="mt-2 text-xs text-slate-500">
                    Stored in your local database
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                  <p className="text-xs text-slate-500">Analysis modules</p>
                  <p className="mt-3 text-3xl font-semibold">
                    {modules.length || "—"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Modules exposing a grade or score
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                  <p className="text-xs text-slate-500">Recorded findings</p>
                  <p className="mt-3 text-3xl font-semibold">
                    {scan ? findings.length : "—"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Items available in structured output
                  </p>
                </div>
              </section>

              {scan?.result && (
                <AssessmentDetails result={scan.result} />
              )}

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
                      <tr
                        key={item.id}
                        className="border-b border-white/[0.05] last:border-0"
                      >
                        <td className="max-w-[220px] py-4 pr-4">
                          <p className="break-all font-medium">
                            {displayTarget(item.target)}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            Scan #{item.id}
                          </p>
                        </td>
                        <td className="whitespace-nowrap py-4 pr-4 text-xs text-slate-400">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-4 pr-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                            {item.status === "completed" ? (
                              <CheckCircle2
                                size={14}
                                className="text-emerald-300"
                              />
                            ) : (
                              <AlertCircle
                                size={14}
                                className="text-amber-300"
                              />
                            )}
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className={`rounded-md border px-2 py-1 text-xs ${gradeStyle(item.grade)}`}
                          >
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
                    <p className="mt-3 text-sm text-slate-300">
                      No saved scans yet.
                    </p>
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
    </div>
  );
}

export default App;