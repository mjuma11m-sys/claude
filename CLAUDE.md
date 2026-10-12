## 🏛️ الديوانية أول (إلزامي)

أي طلب **فيديو** أو **تصميم** أو **تطوير** (ميزة جديدة، تعديل واجهة، تطبيق جديد، ريل، كفر، موشن، هوية) يمر على الديوانية **قبل** أي تنفيذ:
1. شغّل سكل `diwaniya` على الطلب: الجولات السبع كاملة، والنقاش يبين كامل.
2. اعرض الجلسة كأنميشن (`.claude/skills/diwaniya/assets/majlis.html` ← Artifact) واحفظها في `videos/diwaniya-skill/sessions/`.
3. بعدها بس: نفّذ قرار الجلسة بالسكل المناسب (`video-ad-editor`، `motion-video`، `thumbnail-video`، `impeccable`… أو كود التطبيق) وشغّل الاختبارات.
4. اللي انرفض بالجلسة ما ينبني، إلا إذا المستخدم قال غير كذا.

**مستثنى:** إصلاح صغير واضح (خطأ إملائي، لون، سطر واحد، bug بسببه معروف)، أو إذا المستخدم قال «بدون ديوانية» / «نفّذ على طول».

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
