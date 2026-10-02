/**
 * Murmur formatting engine — the "superior logic" layer.
 *
 * Pure, dependency-free, synchronous. Takes raw ASR output plus the
 * previously formatted transcript and returns the polished accumulated text.
 *
 * Responsibilities (in order):
 *   1. voice commands   — punctuation, paragraph breaks, "scratch that"
 *   2. filler removal   — um / uh / er / hmm …
 *   3. cleanup          — spacing, stray punctuation
 *   4. typography       — sentence capitalization, standalone "i" -> "I"
 *   5. auto-punctuation — terminal punctuation on unterminated segments
 *
 * Pro adds two layers on top, both resolved through ./access.ts before they
 * get here: formatting *presets* (concise / notes) and user-defined
 * `customCommands`. Free users get `standard` and the built-in command set, so
 * the paid tier is a real difference in output rather than a badge.
 */

export interface FormatOptions {
  removeFillers: boolean;
  applyCommands: boolean;
  autoPunctuate: boolean;
  /** tuning preset; "standard" is the free default */
  preset?: PresetId;
  /** Pro: phrases the user defined, honored like built-in commands */
  customCommands?: CustomCommand[];
}

export type PresetId = "standard" | "concise" | "notes";

export interface Preset {
  id: PresetId;
  label: string;
  hint: string;
  /** true when the preset is a paid entitlement */
  pro: boolean;
}

/** Single source for the Studio's preset picker and the cheat sheet. */
export const PRESETS: Preset[] = [
  { id: "standard", label: "Standard", hint: "fillers, commands, auto-punctuation", pro: false },
  { id: "concise", label: "Concise", hint: "also drops hedges — basically, you know, I mean", pro: true },
  { id: "notes", label: "Meeting notes", hint: "“new paragraph” becomes a bullet", pro: true },
];

export const DEFAULT_PRESET: PresetId = "standard";

/** A user-defined voice command: say the phrase, get the literal text. */
export interface CustomCommand {
  phrase: string;
  insert: string;
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  removeFillers: true,
  applyCommands: true,
  autoPunctuate: true,
  preset: DEFAULT_PRESET,
  customCommands: [],
};

export interface FormatResult {
  text: string;
  fillersRemoved: number;
  commandsUsed: string[];
  scratched: boolean;
}

/** Canonical voice-command reference — single source for UI cheat sheets. */
export const VOICE_COMMANDS: Array<{ phrase: string; effect: string }> = [
  { phrase: "new paragraph", effect: "starts a new paragraph" },
  { phrase: "new line", effect: "line break" },
  { phrase: "comma · period · colon · semicolon", effect: "inserts that punctuation" },
  { phrase: "question mark · exclamation point", effect: "? and !" },
  { phrase: "full stop", effect: "." },
  { phrase: "open quote · close quote", effect: "curly quotation marks" },
  { phrase: "scratch that · undo that", effect: "deletes the sentence you just finished" },
];

const FILLERS = new Set([
  "um", "uh", "uhh", "uhhh", "er", "erm", "ah", "aah",
  "hmm", "hm", "mhm", "mmhmm", "mm", "mhm",
]);

/**
 * Hedges are the second layer of verbal noise: they survive filler removal
 * because they are real words. Stripping them is the "concise" preset (Pro).
 */
const HEDGES = [
  "at the end of the day",
  "you know",
  "i mean",
  "sort of",
  "kind of",
  "basically",
  "actually",
  "obviously",
  "essentially",
  "literally",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** multi-word phrases rewritten before tokenization */
const PHRASE_COMMANDS: Array<{ re: RegExp; replace: string; name: string }> = [
  { re: /\bnew\s+paragraph\b[.!]?/gi, replace: " <<BREAK>> ", name: "new paragraph" },
  { re: /\bnew\s+line\b[.!]?/gi, replace: " <<NL>> ", name: "new line" },
  {
    re: /\b(scratch\s+that|undo\s+that|delete\s+that)\b[.!]?/gi,
    replace: " <<SCRATCH>> ",
    name: "scratch that",
  },
  { re: /\bquestion\s+mark\b/gi, replace: " <<PUNCT:?>> ", name: "question mark" },
  { re: /\bexclamation\s+(?:mark|point)\b/gi, replace: " <<PUNCT:!>> ", name: "exclamation" },
  { re: /\bfull\s+stop\b/gi, replace: " <<PUNCT:.>> ", name: "full stop" },
  { re: /\bopen\s+quote\b/gi, replace: " <<PUNCT:\u201c>> ", name: "open quote" },
  { re: /\bclose\s+quote\b/gi, replace: " <<PUNCT:\u201d>> ", name: "close quote" },
];

/** single-token punctuation commands */
const WORD_PUNCT: Record<string, string> = {
  comma: ",",
  period: ".",
  colon: ":",
  semicolon: ";",
  "dash": "-",
};

function stripEdges(token: string): string {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function removeLastSentence(text: string): string {
  const t = text.replace(/\s+$/, "");
  if (!t) return "";

  // indices of sentence boundaries: terminator punctuation and line breaks
  const boundaries: number[] = [];
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === "." || c === "!" || c === "?" || c === "\n") boundaries.push(i);
  }
  if (boundaries.length === 0) return "";

  const last = boundaries[boundaries.length - 1];
  const endsWithTerminator = t[last] !== "\n" && last === t.length - 1;
  const start = endsWithTerminator
    ? boundaries.length >= 2
      ? boundaries[boundaries.length - 2] + 1
      : 0
    : last + 1;

  // keep line breaks that preceded the removed sentence, drop trailing spaces
  return t.slice(0, start).replace(/[ \t]+$/, "");
}

function collapseSpacing(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])\s*(?=\S)/g, "$1 ")
    .replace(/\.{2,}(?!\.)/g, ".")
    .replace(/ \n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[ \t]+/gm, "")
    .trim();
}

function applyTypography(text: string): string {
  let out = text;
  // standalone i -> I
  out = out.replace(/(^|[\s(])i(?=[\s.,!?)]|$)/g, "$1I");
  // capitalize first letter after sentence end, line break or bullet
  out = out.replace(
    /(^|[.!?]\s+|\n+|•\s*)([a-z])/g,
    (_m, pre: string, ch: string) => pre + ch.toUpperCase()
  );
  // capitalize very first char
  out = out.replace(/^([a-z])/, (m) => m.toUpperCase());
  return out;
}

/**
 * Format one raw utterance against the already-formatted accumulated text.
 * `previous` is the formatted transcript so far; the returned `text` is the
 * new full accumulated transcript.
 */
export function formatSpeech(
  raw: string,
  previous: string,
  opts: FormatOptions = DEFAULT_FORMAT_OPTIONS
): FormatResult {
  let work = ` ${raw} `;
  const commandsUsed: string[] = [];
  let fillersRemoved = 0;
  let scratched = false;

  const preset = opts.preset ?? DEFAULT_PRESET;
  const dropHedges = preset === "concise" && opts.removeFillers;
  const bulletBreaks = preset === "notes";

  if (opts.applyCommands) {
    for (const { re, replace, name } of PHRASE_COMMANDS) {
      re.lastIndex = 0;
      if (re.test(work)) {
        commandsUsed.push(name);
        re.lastIndex = 0;
        work = work.replace(re, replace);
      }
    }
  }

  // Pro custom commands: expanded before tokenizing so the literal lands in the
  // token stream, exactly like a built-in punctuation command would.
  const customInserts: string[] = [];
  if (opts.applyCommands) {
    for (const custom of opts.customCommands ?? []) {
      const phrase = custom?.phrase?.trim();
      const insert = custom?.insert?.trim();
      if (!phrase || !insert) continue;
      const re = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "gi");
      re.lastIndex = 0;
      if (!re.test(work)) continue;
      re.lastIndex = 0;
      customInserts.push(insert);
      work = work.replace(re, ` <<X${customInserts.length - 1}>> `);
      if (!commandsUsed.includes(phrase)) commandsUsed.push(phrase);
    }
  }

  if (dropHedges) {
    for (const hedge of HEDGES) {
      const re = new RegExp(`\\b${escapeRegExp(hedge)}\\b`, "gi");
      re.lastIndex = 0;
      if (!re.test(work)) continue;
      re.lastIndex = 0;
      work = work.replace(re, " ");
    }
  }

  const tokens = work.split(/\s+/).filter(Boolean);
  let out = previous;

  const appendWord = (word: string) => {
    if (out.length === 0 || out.endsWith("\n") || out.endsWith("\u201c")) {
      out += word;
    } else {
      out += " " + word;
    }
  };

  const appendSymbol = (sym: string) => {
    if (out.length === 0) {
      out = sym;
      return;
    }
    out = out.replace(/\s+$/, "");
    // no space before closing punctuation; keep space after unless line break
    if (/[,.;:!?\u201d)]/.test(sym)) {
      out += sym;
    } else {
      out += (out.endsWith("\n") || out.endsWith(" ") ? "" : " ") + sym;
    }
  };

  /** Custom-command payload: an arbitrary literal, spaced like a word. */
  const appendLiteral = (lit: string) => {
    if (out.length === 0 || out.endsWith("(") || out.endsWith("\u201c")) {
      out += lit;
    } else {
      out += " " + lit;
    }
  };

  for (const token of tokens) {
    if (token === "<<SCRATCH>>") {
      if (opts.applyCommands) {
        out = removeLastSentence(out);
        scratched = true;
        if (!commandsUsed.includes("scratch that")) commandsUsed.push("scratch that");
      }
      continue;
    }
    if (token === "<<BREAK>>") {
      if (opts.applyCommands) {
        out = out.replace(/\s+$/, "").replace(/[ \t]+$/, "");
        if (bulletBreaks) {
          // "notes" preset: a spoken paragraph break is a bullet, not a wall
          out = out.replace(/\n*$/, "");
          if (out.length > 0) out += "\n\n•";
        } else {
          out = out.replace(/([^\n])$/, "$1\n\n");
          if (out.endsWith("\n\n") === false) out += "\n\n";
        }
        if (!commandsUsed.includes("new paragraph")) commandsUsed.push("new paragraph");
      }
      continue;
    }
    if (token === "<<NL>>") {
      if (opts.applyCommands) {
        out = out.replace(/\s+$/, "");
        out = (out.length ? out.replace(/\n*$/, "\n") : "\n");
        if (!commandsUsed.includes("new line")) commandsUsed.push("new line");
      }
      continue;
    }
    const insertMatch = token.match(/^<<X(\d+)>>$/);
    if (insertMatch) {
      appendLiteral(customInserts[Number(insertMatch[1])]);
      continue;
    }

    const punctMatch = token.match(/^<<PUNCT:(.)>>$/);
    if (punctMatch) {
      if (opts.applyCommands) appendSymbol(punctMatch[1]);
      continue;
    }

    const bare = stripEdges(token);
    const lower = bare.toLowerCase();

    if (opts.applyCommands && lower in WORD_PUNCT) {
      // only treat as a command when the token is bare (no attached words)
      if (bare.length === stripEdges(lower).length && token.toLowerCase().replace(/[^\p{L}]/gu, "") === lower) {
        appendSymbol(WORD_PUNCT[lower]);
        if (!commandsUsed.includes(lower)) commandsUsed.push(lower);
        continue;
      }
    }

    if (opts.removeFillers && FILLERS.has(lower)) {
      fillersRemoved += 1;
      continue;
    }

    // drop the token's own edge punctuation if we already ended the sentence,
    // otherwise keep it (ASR often returns real punctuation)
    appendWord(token);
  }

  out = collapseSpacing(out);

  if (opts.autoPunctuate && out.length > 0 && !/[.!?:;"\u201d\n•]$/.test(out)) {
    out += ".";
  }

  out = applyTypography(out);

  return { text: out, fillersRemoved, commandsUsed, scratched };
}

/** Quick one-shot helper for demos: format a phrase from scratch. */
export function formatOnce(raw: string, opts?: FormatOptions): FormatResult {
  return formatSpeech(raw, "", opts);
}

/** Word count of a transcript. */
export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}
