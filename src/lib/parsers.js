// Parse <mcp_conductor_AskUserQuestion> XML format
export function parseXMLQuestion(text) {
  const regex = /<mcp_conductor_AskUserQuestion>([\s\S]*?)<\/mcp_conductor_AskUserQuestion>/g;
  const questions = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const block = match[1];
    const qMatch = block.match(/<question>([\s\S]*?)<\/question>/);
    const idMatch = block.match(/<question_id>([\s\S]*?)<\/question_id>/);
    if (!qMatch) continue;
    const questionText = qMatch[1].trim();
    const questionId = idMatch ? idMatch[1].trim() : "q-" + questions.length;
    const lines = questionText.split("\n");
    const options = [];
    let title = "";
    let description = [];
    let currentOption = null;
    for (const line of lines) {
      const optMatch = line.match(/^([A-Z])\)\s+(.+)/);
      if (optMatch) {
        if (currentOption) options.push(currentOption);
        const label = optMatch[2].trim();
        const recommended = /\(recommended\)/i.test(label);
        currentOption = { key: optMatch[1], label: label.replace(/\s*\(recommended\)\s*/i, ""), recommended, pros: [], cons: [] };
      } else if (currentOption && line.trim().startsWith("✅")) {
        currentOption.pros.push(line.trim().replace(/^✅\s*/, ""));
      } else if (currentOption && line.trim().startsWith("❌")) {
        currentOption.cons.push(line.trim().replace(/^❌\s*/, ""));
      } else if (!currentOption) {
        if (!title && line.trim() && !line.trim().startsWith("✅") && !line.trim().startsWith("❌")) title = line.trim();
        else if (line.trim()) description.push(line.trim());
      }
    }
    if (currentOption) options.push(currentOption);
    questions.push({ id: questionId, title, text: description.join("\n"), options });
  }
  return questions;
}

export function parseGstackQuestion(text) {
  const questions = [];
  const regex = /<gstack-qid:(.*?)>([\s\S]*?)(?:<\/tool_code>|\n\n|$)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const id = match[1].trim();
    const block = match[2];
    const askIdx = block.indexOf("AskUserQuestion(");
    if (askIdx === -1) continue;
    const inner = block.slice(askIdx);
    const titleMatch = inner.match(/question_title\s*=\s*['"]([\s\S]*?)['"]/);
    const textMatch = inner.match(/question_text\s*=\s*["']([\s\S]*?)["']\s*,?\s*(?:options|$|\))/);
    const title = titleMatch ? titleMatch[1] : "";
    const qText = textMatch ? textMatch[1] : "";
    const options = [];
    const optRegex = /\{\s*['"]?key['"]?\s*:\s*['"](.*?)['"],\s*['"]?label['"]?\s*:\s*['"](.*?)['"](?:,\s*['"]?description['"]?\s*:\s*['"]([\s\S]*?)['"])?\s*\}/g;
    let optMatch;
    while ((optMatch = optRegex.exec(inner)) !== null) {
      options.push({ key: optMatch[1], label: optMatch[2], description: optMatch[3] || "", pros: [], cons: [], recommended: false });
    }
    questions.push({ id, title, text: qText, options });
  }
  return questions;
}

export function parsePythonQuestion(text) {
  const questions = [];
  const starts = [...text.matchAll(/AskUserQuestion\(/g)];
  for (const s of starts) {
    let depth = 1;
    let i = s.index + s[0].length;
    while (i < text.length && depth > 0) { if (text[i] === '(') depth++; else if (text[i] === ')') depth--; i++; }
    const inner = text.slice(s.index + s[0].length, i - 1);
    const idMatch = inner.match(/question_id\s*=\s*['"](.*?)['"]/);
    const titleMatch = inner.match(/question_title\s*=\s*['"]([\s\S]*?)['"]/);
    const textMatch = inner.match(/question_text\s*=\s*["']([\s\S]*?)["']\s*,?\s*(?:options|$|\))/);
    const id = idMatch ? idMatch[1] : "q-" + questions.length;
    const title = titleMatch ? titleMatch[1] : "";
    const qText = textMatch ? textMatch[1] : "";
    const options = [];
    const optRegex = /\{\s*['"]?key['"]?\s*:\s*['"](.*?)['"],\s*['"]?label['"]?\s*:\s*['"](.*?)['"](?:,\s*['"]?description['"]?\s*:\s*['"]([\s\S]*?)['"])?\s*\}/g;
    let optMatch;
    while ((optMatch = optRegex.exec(inner)) !== null) {
      options.push({ key: optMatch[1], label: optMatch[2], description: optMatch[3] || "", pros: [], cons: [], recommended: false });
    }
    if (options.length > 0 || title) questions.push({ id, title, text: qText, options });
  }
  return questions;
}

export function parseQuestions(text) {
  let questions = parseXMLQuestion(text);
  if (questions.length === 0) questions = parseGstackQuestion(text);
  if (questions.length === 0) questions = parsePythonQuestion(text);
  return questions;
}

export function extractThinking(text) {
  const blocks = [];
  const regex = /<thinking>([\s\S]*?)<\/thinking>/g;
  let match;
  while ((match = regex.exec(text)) !== null) blocks.push(match[1].trim());
  return blocks;
}

export function stripSpecialBlocks(text) {
  let clean = text;
  clean = clean.replace(/<mcp_conductor_AskUserQuestion>[\s\S]*?<\/mcp_conductor_AskUserQuestion>/g, "");
  clean = clean.replace(/<thinking>[\s\S]*?<\/thinking>/g, "");
  clean = clean.replace(/<gstack-qid:.*?>[\s\S]*?(?:<\/tool_code>|AskUserQuestion\([\s\S]*?\))/g, "");
  clean = clean.replace(/<tool_code>[\s\S]*?<\/tool_code>/g, "");
  clean = clean.replace(/AskUserQuestion\([\s\S]*?\)\s*/g, "");
  clean = clean.replace(/<\/?[a-zA-Z_][a-zA-Z0-9_-]*(?:\s[^>]*)?\s*>/g, "");
  return clean.trim();
}
