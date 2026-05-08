export interface RawProfile {
  name: string;
  role: string;
  summary: string;
  experience: { role: string; company: string; startDate: string; endDate: string; bullets: string[] }[];
  education: { degree: string; school: string; period: string }[];
}

export interface EnrichedProfile {
  highlights: string[];
  roles: { title: string; bullets: string[] }[];
  meta: { plants: number; years: number };
  score: { value: number; label: string };
  summary: string[];
}

const FILLER_WORDS = /\b(successfully|effectively|actively|proactively|diligently)\b\s*/gi;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ensurePeriod(s: string): string {
  return s.endsWith(".") ? s : s + ".";
}

const KPI_PATTERNS = [
  /\bby\s+\d+\s*(%|points?|pts?|x)\b/gi,
  /\b(OEE|oee)\b/gi,
  /[+-]\d+\s*(%|points?|pts?)/g,
  /\b\d+\s*%(\s|$)/g,
  /\bcycle\s+time\b/gi,
];

function hasKPI(s: string): boolean {
  return KPI_PATTERNS.some(rx => { rx.lastIndex = 0; return rx.test(s); });
}

function removeFiller(s: string): string {
  return s.replace(FILLER_WORDS, "").trim();
}

function removeRepeatedWords(s: string): string {
  return s.replace(/\b(\w+)\s+\1\b/gi, "$1");
}

function hasMultipleIdeas(s: string): boolean {
  const parts = s.split(/\band\b/i);
  return parts.length > 2 || (parts.length === 2 && parts[1].split(/\s+/).length >= 4);
}

function hasFormattingIssues(bullets: string[]): boolean {
  return bullets.some(b => !b.match(/^[A-Z]/) || !b.endsWith(".") || hasMultipleIdeas(b));
}

export function cleanBullets(bullets: string[]): string[] {
  return bullets
    .map(b => b.trim())
    .filter(b => b.length >= 20)
    .filter(b => b.split(/\s+/).length >= 6)
    .map(b => {
      let cleaned = b;
      cleaned = removeFiller(cleaned);
      cleaned = removeRepeatedWords(cleaned);
      cleaned = capitalize(cleaned.charAt(0).toLowerCase() + cleaned.slice(1));
      return ensurePeriod(cleaned);
    });
}

export function dedupeBullets(bullets: string[]): string[] {
  const seen = new Set<string>();
  return bullets.filter(b => {
    const key = b.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatDate(start: string, end: string): string {
  if (!start && !end) return "";
  const s = start ? start.slice(0, 4) : "";
  const e = !end || end.toLowerCase() === "present" ? "Present" : end.slice(0, 4);
  return s ? `${s} - ${e}` : e;
}

function extractYear(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = String(value).match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function calculateExperienceYears(experiences: { startDate: string; endDate?: string }[]): number {
  if (!experiences || experiences.length === 0) return 0;
  const startYears = experiences.map(e => extractYear(e.startDate || e.endDate)).filter((y): y is number => y !== null);
  if (startYears.length === 0) return 0;
  const earliestYear = Math.min(...startYears);
  const currentYear = new Date().getFullYear();
  return Math.max(0, currentYear - earliestYear);
}

export function buildHighlights(scope: string | null, years: number): string[] {
  const highlights: string[] = [];
  if (scope) highlights.push(scope);
  if (years > 0) highlights.push(`${years} ${years === 1 ? "year" : "years"} experience`);
  return highlights.slice(0, 4);
}

export function computeScore(experiences: { bullets: string[] }[], summary: string, education: unknown[]): { value: number; label: string } {
  const hasRoles = experiences.length > 0;
  const hasSummary = summary.trim().length > 0;
  const hasEdu = education.length > 0;

  let value = 100;

  const allBullets = experiences.flatMap(e => e.bullets);
  const weakBullets = allBullets.filter(b => b.split(/\s+/).length < 6);
  const deduped = dedupeBullets(allBullets);
  const kpiBullets = allBullets.filter(b => hasKPI(b));
  const multiIdeaBullets = allBullets.filter(b => hasMultipleIdeas(b));

  if (hasFormattingIssues(allBullets)) value -= 3;
  if (kpiBullets.length > 0) value -= 5;
  if (multiIdeaBullets.length > 0) value -= 3;
  if (allBullets.length - deduped.length > 0) value -= 5;
  if (weakBullets.length > 0) value -= 2;
  if (!hasRoles) value -= 5;
  if (!hasSummary) value -= 5;
  if (!hasEdu) value -= 3;

  if (hasFormattingIssues(allBullets)) {
    value = Math.min(value, 90);
  }

  const clamped = Math.max(0, Math.round(value));
  const label = clamped >= 90 ? "Strong profile" : clamped >= 70 ? "Good profile" : "Needs improvement";
  return { value: clamped, label };
}

function normalizeSummary(text: string): string[] {
  if (!text.trim()) return [];
  const sentences = text.split(/[.!\n]+/).filter(Boolean).map(s => s.trim()).filter(s => s.split(/\s+/).length >= 6);
  const seen = new Set<string>();
  return sentences
    .filter(s => {
      const key = s.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3)
    .map(s => {
      let cleaned = s;
      cleaned = removeFiller(cleaned);
      cleaned = removeRepeatedWords(cleaned);
      cleaned = capitalize(cleaned.charAt(0).toLowerCase() + cleaned.slice(1));
      return ensurePeriod(cleaned);
    });
}

export function normalizeProfile(raw: RawProfile): EnrichedProfile {
  const roles = raw.experience.map(exp => {
    const bullets = dedupeBullets(cleanBullets(exp.bullets)).slice(0, 3);
    return { title: exp.role, bullets };
  });

  const summary = normalizeSummary(raw.summary);

  const allBullets = raw.experience.flatMap(e => e.bullets);
  const scope = allBullets.join(" ").match(/\d+\s+(plants|lines|teams)/gi)?.[0] || null;
  const totalYears = calculateExperienceYears(raw.experience);
  const plantsCount = scope ? parseInt(scope) || 0 : 0;

  const score = computeScore(raw.experience, raw.summary, raw.education);
  const highlights = buildHighlights(scope, totalYears);

  return {
    highlights,
    roles,
    meta: { plants: plantsCount, years: totalYears },
    score,
    summary,
  };
}
