import fs from 'fs';
import path from 'path';

const KNOWLEDGE_DIR = './knowledge';
const NOTES_FILE = './knowledge/community-notes.json'; // Matches your GitHub file

let cachedKnowledge = "";
let highPriorityNotes = [];

export async function loadKnowledge() {
  try {
    // 1. Load All Files in Knowledge Folder (Base Knowledge)
    let combined = "";
    const files = fs.readdirSync(KNOWLEDGE_DIR);
    
    for (const file of files) {
      // Skip the JSON file (that's for overrides) and hidden files
      if (file === 'community-notes.json' || file.startsWith('.')) continue;
      
      const filePath = path.join(KNOWLEDGE_DIR, file);
      if (fs.lstatSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath, 'utf-8');
        combined += `\n--- FILE: ${file} ---\n${content}\n`;
      }
    }

    // Trim to stay under Groq free tier limits
    cachedKnowledge = combined.slice(0, 15000);

    // 2. Load High-Priority Overrides (/addinfo)
    if (fs.existsSync(NOTES_FILE)) {
      const data = fs.readFileSync(NOTES_FILE, 'utf-8');
      highPriorityNotes = JSON.parse(data || '[]');
    } else {
      highPriorityNotes = [];
      fs.writeFileSync(NOTES_FILE, JSON.stringify([], null, 2));
    }
    
    console.log(`Knowledge base loaded. ${highPriorityNotes.length} high-priority notes active.`);
  } catch (err) {
    console.error("Error loading knowledge:", err);
    cachedKnowledge = "Error loading knowledge base.";
  }
}

export function buildSystemPrompt() {
  const overrides = highPriorityNotes.map(n => n.text).join('\n');
  
  return `You are "Record the AI," a friendly, sarcastic, and humorous support bot for the Record-able Minecraft mod.
  
  BASE KNOWLEDGE:
  ${cachedKnowledge}
  
  HIGH-PRIORITY INSTRUCTIONS (OVERRIDE EVERYTHING ELSE):
  ${overrides}
  
  PERSONALITY:
  - Be helpful but include sarcasm and humor.
  - If a high-priority instruction contradicts the base knowledge, follow the high-priority one.
  - Do not mention you are an AI unless asked.`;
}

export async function addNote(text, author) {
  const newNote = { 
    id: Date.now(), // Unique ID based on time
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
