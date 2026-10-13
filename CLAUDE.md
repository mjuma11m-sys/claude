## 🚦 مين يقرر قبل التنفيذ (إلزامي)

| الطلب | يمر على | العرض المتحرك |
|---|---|---|
| **فيديو أو إنتاج تسويقي**: ريل، إعلان، موشن، بودكاست، مونتاج، كفر، كابشن، سكربت، حملة، خطة محتوى، بوست | **`diwaniya`** (الديوانية) — الجولات السبع | `.claude/skills/diwaniya/assets/majlis.html` ← `videos/diwaniya-skill/sessions/` |
| **كل شي ثاني**: تطوير تطبيق أو ميزة، كود، واجهة تطبيق، قاعدة بيانات، نشر، أمان، خصوصية/قانوني، فلوس، قرار تجاري | **`diwaniya-company`** (الشركة) — تذكرة DW + اجتماع (سريع للصغير، كامل للكبير) | `.claude/skills/diwaniya-company/assets/boardroom.html` ← `videos/diwaniya-skill/sessions/company-DW-xxx.html` |

1. شغّل السكل المناسب على الطلب قبل أي تنفيذ، والنقاش يبين كامل.
2. اعرض الجلسة/الاجتماع كأنميشن (Artifact) واحفظه.
3. بعدها بس: نفّذ القرار بالسكل المناسب وشغّل الاختبارات.
4. اللي انرفض ما ينبني، إلا إذا المستخدم قال غير كذا.
5. طلب فيه الاثنين (ميزة + فيديو لها): الشركة تقرر وتبني الميزة، والديوانية تنتج الفيديو.

**مستثنى:** إصلاح صغير واضح (خطأ إملائي، لون، سطر واحد، bug بسببه معروف)، أو المستخدم قال «بدون ديوانية» / «بدون شركة» / «نفّذ على طول».

## 📣 محتوى «حياتي»

- **صراحة مطلقة:** لا كليك بيت ولا مبالغة ولا وعد بميزة ما تشتغل اليوم. «تقدير» مو «يقرر»، «الصق» مو «بروحها». أي لقطة ببيانات تجريبية ينكتب عليها «* لقطات ببيانات تجريبية».

- **لا يوم إطلاق** ولا تاريخ ولا عد تنازلي بأي فيديو أو صورة أو كابشن لين تخلص البرمجة ويقول المستخدم. نكتب «قريباً 👀» بالتشويق (ستوري، فيديو قصير)، و«قيد التطوير · نسخة تجريبية» بالبايو والبوستات والريلز.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Token budget
Always apply `.claude/skills/token-saver/SKILL.md`: answer directly with no preamble or recap, read only the needed lines, trim command output, prefer Edit over Write, and spawn no subagents unless asked.

When several skills could apply, pick via `.claude/skills/skill-index/SKILL.md` and load the fewest that cover the task.
