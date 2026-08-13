import fs from 'fs';
import path from 'path';

const KNOWLEDGE_DIR = './knowledge';
const NOTES_FILE = './knowledge/overrides.json';

let cachedKnowledge = "";
let highPriorityNotes = [];

// Ensure the overrides file exists
if (!fs.existsSync(NOTES_FILE)) {
  fs.writeFileSync(NOTES_FILE, JSON.stringify([], null, 2));
}

export async function loadKnowledge() {
  try {
    // 1. Load GitHub Files (Standard Knowledge)
    let combined = "";
    const files = fs.readdirSync(KNOWLEDGE_DIR);
    
    for (const file of files) {
      if (file.endsWith('.md') || file.endsWith('.txt')) {
        const content = fs.readFileSync(path.join(KNOWLEDGE_DIR, file), 'utf-8');
        combined += `\n--- FILE: ${file} ---\n${content}\n`;
      }
    }

    // Trim to 15,000 characters to stay under Groq free tier limits
    cachedKnowledge = combined.slice(0, 15000);

    // 2. Load High-Priority Overrides (/addinfo)
    const data = fs.readFileSync(NOTES_FILE, 'utf-8');
    highPriorityNotes = JSON.parse(data || '[]');
    
    console.log(`Knowledge base loaded. ${highPriorityNotes.length} overrides active.`);
  } catch (err) {
    console.error("Error loading knowledge:", err);
    cachedKnowledge = "Error loading knowledge base.";
  }
}

export function buildSystemPrompt() {
  // We put high-priority notes AT THE BOTTOM so the AI sees them last (most important)
  const overrides = highPriorityNotes.map(n => n.text).join('\n');
  
  return `You are "Record the AI," a friendly, sarcastic, and humorous support bot for the Record-able Minecraft mod.
  
  BASE KNOWLEDGE:
  ${cachedKnowledge}
  
  HIGH-PRIORITY INSTRUCTIONS (MUST FOLLOW THESE OVER ANYTHING ELSE):
  ${overrides}
  
  PERSONALITY:
  - Be helpful but include sarcasm and humor.
  - If a high-priority instruction contradicts the base knowledge, follow the high-priority one.
  - Do not mention you are an AI unless asked.`;
}

export async function addNote(text, author) {
  const newNote = { 
    id: highPriorityNotes.length + 1, 
    text, 
    author, 
    addedAt: new Date().toISOString() 
  };
  highPriorityNotes.push(newNote);
  fs.writeFileSync(NOTES_FILE, JSON.stringify(highPriorityNotes, null, 2));
  return newNote;
}

export async function removeNote(id) {
  const originalLength = highPriorityNotes.length;
  highPriorityNotes = highPriorityNotes.filter(n => n.id !== id);
  fs.writeFileSync(NOTES_FILE, JSON.stringify(highPriorityNotes, null, 2));
  return highPriorityNotes.length !== originalLength;
}

export function listNotes() {
  return highPriorityNotes;
}
