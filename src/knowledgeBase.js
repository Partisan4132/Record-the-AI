import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOD_INFO_PATH = path.join(__dirname, '..', 'knowledge', 'mod-info.md');
const NOTES_PATH = path.join(__dirname, '..', 'knowledge', 'community-notes.json');

function loadModInfo() {
  return fs.readFileSync(MOD_INFO_PATH, 'utf-8');
}

function loadNotes() {
  if (!fs.existsSync(NOTES_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(NOTES_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  fs.writeFileSync(NOTES_PATH, JSON.stringify(notes, null, 2));
}

/** Add a new fact to the knowledge base. Returns the created entry. */
export function addNote(text, author) {
  const notes = loadNotes();
  const nextId = notes.length ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
  const entry = { id: nextId, text, author, addedAt: new Date().toISOString() };
  notes.push(entry);
  saveNotes(notes);
  return entry;
}

/** Remove a note by ID. Returns true if something was removed. */
export function removeNote(id) {
  const notes = loadNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return false;
  notes.splice(idx, 1);
  saveNotes(notes);
  return true;
}

export function listNotes() {
  return loadNotes();
}

/** Builds the full system prompt: base docs + anything added via /addinfo. */
export function buildSystemPrompt() {
  const modInfo = loadModInfo();
  const notes = loadNotes();

  const notesSection = notes.length
    ? `\n\n## Additional notes (added by mods/devs after initial setup)\n\n${notes
        .map((n) => `- ${n.text} (added ${n.addedAt.slice(0, 10)})`)
        .join('\n')}`
    : '';

  return `You are the support assistant for "record-able", a Fabric screen-recording mod for Minecraft: Java Edition, answering questions in this Discord server's support channel.

Answer using ONLY the knowledge base below. If the answer isn't in it, say you're not sure rather than guessing, and point the user to the GitHub issues page (https://github.com/JoEusebe/record-able/issues) or the mod's Discord (https://discord.com/invite/record-able).

This is a live chat channel, not a wiki page — keep answers short and practical. Use Discord markdown: backticks for settings/keybinds/commands, short bullet lists for steps.

# Knowledge base

${modInfo}${notesSection}`;
}
