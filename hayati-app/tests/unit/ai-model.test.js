// DW-046: «اسأل حياتي» على Sonnet 5.5 (نص التكلفة)، والباقي يظل على Opus
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../../supabase/functions/lecture-ai/index.ts'), 'utf8');

test('the assistant uses Sonnet 5.5 by default, lectures/photos/PDFs keep Opus, and both are switchable from secrets', () => {
  // DW-114: سؤال قصير ← Haiku، والخطط والتحليل ← Sonnet
  assert.match(src, /mode === "ask"\s*\?\s*\(easy \? Deno\.env\.get\("AI_MODEL_ASK_SMALL"\) \?\? "claude-haiku-5-5" : Deno\.env\.get\("AI_MODEL_ASK"\) \?\? "claude-sonnet-5-5"\)/);
  assert.match(src, /:\s*Deno\.env\.get\("AI_MODEL"\) \?\? "claude-opus-5-5"/);
  assert.doesNotMatch(src, /thinking:\s*\{\s*type:\s*"disabled"/);   // Sonnet 5.5 يرفض disabled
});
