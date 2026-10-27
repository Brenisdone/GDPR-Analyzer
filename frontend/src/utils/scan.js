export function formatName(value) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getModules(result) {
  if (!result || typeof result !== "object") return [];

  const moduleKeys = ["cookies", "web_beacons", "security_transmission"];

  return moduleKeys
    .filter((key) => result[key] && typeof result[key] === "object")
    .map((key) => ({
      name: formatName(key),
      grade: result[key].grade ?? "—",
      score: result[key].score,
    }));
}

export function getFindings(result) {
  const findings = [];
  const listKeys = /finding|url|cookie|beacon|issue|tracker/i;

  function walk(value, path = []) {
    if (!value || typeof value !== "object") return;

    for (const [key, child] of Object.entries(value)) {
      if (Array.isArray(child) && listKeys.test(key)) {
        const section = path.concat(key).map(formatName).join(" / ");
        child.forEach((item) => {
          if (item && typeof item === "object") {
            findings.push({ section, ...item });
          } else {
            findings.push({ section, value: item });
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

export function gradeStyle(grade) {
  const value = String(grade || "").toUpperCase();

  if (value === "A") return "text-emerald-300 border-emerald-400/30 bg-emerald-400/10";
  if (value === "B") return "text-lime-300 border-lime-400/30 bg-lime-400/10";
  if (value === "C") return "text-amber-300 border-amber-400/30 bg-amber-400/10";
  if (["D", "E", "F"].includes(value)) {
    return "text-rose-300 border-rose-400/30 bg-rose-400/10";
  }

  return "text-slate-300 border-slate-700 bg-slate-800";
}

export function displayTarget(target = "") {
  return target.replace(/^https?:\/\//, "").replace(/\/$/, "");
}