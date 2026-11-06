const PROTOCOL_LABELS = {
  SSLv2: "SSL 2",
  SSLv3: "SSL 3",
  TLSv1: "TLS 1.0",
  TLSv1_1: "TLS 1.1",
  TLSv1_2: "TLS 1.2",
  TLSv1_3: "TLS 1.3",
};

function protocolLabel(protocol) {
  return PROTOCOL_LABELS[protocol] || protocol.replace(/_/g, " ");
}

export function DonutChart({ title, description, total, segments, emptyMessage = "No data available to chart." }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const arcs = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const length = (segment.value / Math.max(total, 1)) * circumference;
      const arc = { ...segment, length, offset };
      offset += length;
      return arc;
    });

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#080d18]/50 p-4">
      <div className="mb-3">
        <h4 className="text-sm font-medium text-slate-200">{title}</h4>
        {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
      </div>

      {total > 0 ? (
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center">
          <svg
            viewBox="0 0 108 108"
            role="img"
            aria-label={`${title}: ${segments.map((segment) => `${segment.label} ${segment.value}`).join(", ")}`}
            className="h-36 w-36 shrink-0"
          >
            <circle cx="54" cy="54" r={radius} fill="none" stroke="#1e293b" strokeWidth="13" />
            <g transform="rotate(-90 54 54)">
              {arcs.map((arc) => (
                <circle
                  key={arc.label}
                  cx="54"
                  cy="54"
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="13"
                  strokeDasharray={`${arc.length} ${circumference - arc.length}`}
                  strokeDashoffset={-arc.offset}
                  strokeLinecap="butt"
                />
              ))}
            </g>
            <text
              x="54"
              y="51"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#f8fafc"
              fontSize="19"
              fontWeight="600"
            >
              {total}
            </text>
            <text
              x="54"
              y="68"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="7"
            >
              TOTAL
            </text>
          </svg>

          <div className="w-full min-w-0 space-y-2">
            {segments.map((segment) => {
              const percentage = total > 0 ? Math.round((segment.value / total) * 100) : 0;
              return (
                <div key={segment.label} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-slate-400">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: segment.color }} />
                    <span>{segment.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-200">
                    {segment.value} <span className="text-slate-500">({percentage}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-white/10 px-3 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

export function StackedBarChart({ title, description, rows, legend }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#080d18]/50 p-4">
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-200">{title}</h4>
        {description && <p className="mt-1 text-xs le`ad`ing-5 text-slate-500">{description}</p>}
      </div>

      <div className="space-y-5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-300">{row.label}</span>
              <span className="tabular-nums text-slate-500">{row.total} cookies</span>
            </div>
            <div
              className="flex h-4 overflow-hidden rounded-full bg-slate-800"
              role="img"
              aria-label={`${row.label}: ${row.segments.map((segment) => `${segment.label} ${segment.value}`).join(", ")}`}
            >
              {row.segments.map((segment) => (
                <div
                  key={segment.label}
                  className={segment.className}
                  style={{ width: `${row.total > 0 ? (segment.value / row.total) * 100 : 0}%` }}
                  title={`${segment.label}: ${segment.value}`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {row.segments.map((segment) => (
                <span key={segment.label} className="text-[11px] text-slate-500">
                  {segment.label}: <span className="tabular-nums text-slate-300">{segment.value}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {legend && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.06] pt-3">
          {legend.map((item) => (
            <span key={item.label} className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className={`h-2.5 w-2.5 rounded-sm ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function VerticalBarChart({ title, description, items, emptyMessage = "No data available to chart." }) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#080d18]/50 p-4">
      <div className="mb-3">
        <h4 className="text-sm font-medium text-slate-200">{title}</h4>
        {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item) => {
            const height = item.value > 0 ? Math.max(7, (item.value / maxValue) * 112) : 3;
            return (
              <div key={item.label} className="min-w-0">
                <div className="flex h-36 flex-col items-center justify-end">
                  <span className="mb-2 text-xs font-semibold tabular-nums text-slate-200">{item.value}</span>
                  <div
                    className="w-8 rounded-t-md transition-all sm:w-10"
                    style={{ height: `${height}px`, backgroundColor: item.color }}
                    role="img"
                    aria-label={`${item.label}: ${item.value}`}
                    title={`${item.label}: ${item.value}`}
                  />
                  <div className="mt-2 h-px w-full bg-slate-700" />
                </div>
                <p className="mt-2 text-center text-[11px] leading-4 text-slate-400">{item.label}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-white/10 px-3 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

export function ProtocolMatrix({ protocols }) {
  const orderedNames = ["SSLv2", "SSLv3", "TLSv1", "TLSv1_1", "TLSv1_2", "TLSv1_3"];
  const sorted = orderedNames
    .map((name) => protocols.find(([protocol]) => protocol === name))
    .filter(Boolean);
  const remaining = protocols.filter(([name]) => !orderedNames.includes(name));
  const entries = [...sorted, ...remaining];

  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No protocol support details were returned.</p>;
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#080d18]/50 p-4">
      <div className="mb-3">
        <h4 className="text-sm font-medium text-slate-200">Protocol support map</h4>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Older protocol versions are highlighted because they may need to be disabled. “Not tested” is different from “not supported.”
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {entries.map(([name, value]) => {
          const normalized = String(value || "").toUpperCase();
          const isLegacy = ["SSLv2", "SSLv3", "TLSv1", "TLSv1_1"].includes(name);
          const enabled = normalized === "YES";
          const disabled = normalized === "NO";
          const style = enabled && isLegacy
            ? "border-amber-400/30 bg-amber-400/[0.07] text-amber-200"
            : enabled
              ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200"
              : disabled
                ? "border-slate-600 bg-slate-700/20 text-slate-400"
                : "border-dashed border-white/[0.12] bg-white/[0.015] text-slate-500";
          return (
            <div key={name} className={`rounded-lg border p-3 ${style}`}>
              <p className="text-xs font-semibold">{protocolLabel(name)}</p>
              <p className="mt-1 text-[11px]">{enabled ? "Supported" : disabled ? "Not supported" : "Not tested"}</p>
              <p className="mt-2 text-[10px] uppercase tracking-wide opacity-60">
                {isLegacy ? "Legacy" : "Current generation"}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-emerald-400" /> Supported</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-amber-400" /> Legacy protocol supported</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-slate-600" /> Not supported</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm border border-dashed border-slate-500" /> Not tested</span>
      </div>
    </div>
  );
}

export function CertificateTimeline({ start, end, now }) {
  const startTime = start ? new Date(start).getTime() : Number.NaN;
  const endTime = end ? new Date(end).getTime() : Number.NaN;
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return null;
  }

  const progress = Math.max(0, Math.min(100, ((now - startTime) / (endTime - startTime)) * 100));
  const daysRemaining = Math.ceil((endTime - now) / 86400000);
  const status = daysRemaining < 0
    ? `Expired ${Math.abs(daysRemaining)} day(s) ago`
    : now < startTime
      ? `Validity starts in ${Math.ceil((startTime - now) / 86400000)} day(s)`
      : `${daysRemaining} day(s) remaining in reported validity window`;
  const formatDate = (value) => new Date(value).toLocaleDateString();

  return (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#080d18]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-slate-200">Certificate validity timeline</h4>
        <span className={`text-xs ${daysRemaining < 0 ? "text-rose-300" : "text-cyan-200"}`}>{status}</span>
      </div>
      <div className="relative mt-4">
        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-cyan-400/70" style={{ width: `${progress}%` }} />
        </div>
        <div className="absolute -top-1 h-5 w-0.5 bg-white" style={{ left: `${progress}%` }} />
      </div>
      <div className="mt-2 flex justify-between gap-3 text-[11px] text-slate-500">
        <span>Starts {formatDate(start)}</span>
        <span>Expires {formatDate(end)}</span>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        This timeline compares the reported dates with the current date. It does not independently verify the certificate chain, hostname, or revocation status.
      </p>
    </div>
  );
}

