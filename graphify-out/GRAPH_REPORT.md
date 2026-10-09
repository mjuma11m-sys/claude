# Graph Report - claude  (2026-10-09)

## Corpus Check
- Large corpus: 295 files · ~512,660 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 3020 nodes · 6386 edges · 171 communities (140 shown, 31 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 382 edges (avg confidence: 0.84)
- Token cost: 551,096 input · 0 output

## Community Hubs (Navigation)
- Impeccable Live Browser Core
- Lottie SVG Runtime
- Motion Engine & Story Scenes
- Live Params Panel
- Lottie Graphics Library (Py)
- Three.js SVG Loader
- Live Configure Bar
- Cut, Zoom & Backdrop Scripts
- Live Agent Steering
- Lottie Minified Internals
- Design Taste Frontend Rules
- Live Edit Lifecycle
- OGraf Headline Schema
- Live UI Chrome & Theming
- Live Session Recovery
- Design Panel Builders
- Studio Server
- Animation Decision Philosophy
- UI Library Picks & Anim Review
- Talking Avatar & Assets
- Onboarding Server
- Hook Overlay Pipeline
- Podcast Multi-Cam Mode
- Montage Builder
- Live Insert & Annotation
- SFX Synthesis
- Procedural Audio FX
- Cut Plan & Captions
- Music Bed Synth
- Asset Producer Agent
- Manual Edit Apply Dock
- Image-Gen Design Rules
- Semantic Shot Search
- Beat Detection
- Lottie Expressions
- OGraf Background Schema
- Impeccable Init & Modes
- Voiceover & Alignment
- Puppeteer Demo Recorder
- Audio Denoise
- Bolder & Clarify Commands
- Craft Floor & Doctor
- Motion Mode & Screen Rec
- Frame Renderer (render.js)
- 3D Device Scene Script
- Timeline Builder
- Live Browser DOM Helpers
- Compose Example Widgets
- Lottie Shot Renderer
- Lottie Path Geometry
- Colorize & Edit Applier
- Motion Rules & Pre-export
- Live Session State
- Person Masks & Scopes
- Brandkit Skill
- Mobile Native & iOS
- Agent Target Claiming
- Three.js Mask Pass
- Break-UI Data Catalog
- Video Editor Env & Backdrop
- Screenshot Lib (minified)
- Screenshot Lib Internals A
- Three.js Geometry Utils
- Text-Behind-Person Render
- Beat FX Renderer
- OGraf Scene Wrapper
- Animation Vocabulary
- Three.js Text Geometry
- Three.js Effect Composer
- Theme Color Extraction
- Lottie Vector Math
- Android & Animate Ref
- Swift Vision Tracking
- Svelte DOM Commit
- Long-Form Transcription
- Motion Kit Widgets
- Web Animation Recipes
- Sonner Toasts
- Expo Animation Skill
- Podcast Written Hook
- Three.js FXAA Pass
- Beat FX Drawing
- Beat FX Layer API
- OGraf Background Scene
- OGraf Caption Scene
- OGraf Headline Scene
- Expo Animation Recipes
- Apple Springs & Gestures
- Reel Frame Screenshots
- Studio & Arabic Word FX
- Write Swift Skill
- Three.js Output Pass
- Frame Render Script
- Safe-Area Checker
- Collage Renderer
- OGraf Motion Kit
- Asset Review & Plates
- Montage & Motion Skills
- Redesign & Stitch Taste
- Phone & Cloud Playbook
- Effect Composer Core
- Podcast Renderer
- Lottie SVG Effects
- Animate Skill Core
- 3D Device Renderer
- Podcast Pipeline Upgrades
- Lottie Masks & Shapes
- OGraf Caption Manifest
- Brutalist & Minimalist UI
- Arabic Font Licenses
- Sports Hub Promo Facts
- Creator Onboarding
- Remotion & Script Map
- Screenshot Lib Internals B
- Screenshot Lib Internals C
- Wide Podcast Render
- OGraf Numeric Params
- Layout & Visitor Modes
- Collage Template & Assets
- Setup Script
- Lottie Seeded Random
- Manual Edit Applier Agent
- Adapt Commands
- Live Ignore Rules
- Screenshot Lib Internals D
- Unreal Bloom Pass
- OGraf Schema Header
- DaVinci Video Skill
- Beat & Shot Search Refs
- Explainer Pace & Motion Kit
- Rounded Box Geometry
- Afterimage Pass
- Shell Compat Helpers
- OGraf Param Group A
- OGraf Param Group B
- OGraf Param Group C
- OGraf Size Param
- Podcast Video Skill
- Onboarding Taste Page
- Inline Text Editing
- Room Environment
- Phone Preview Check
- Lottie Color Math
- Motion Kit Shared Module
- Text Behind Head Rules
- DaVinci Mode Refs
- Cover & Thumbnail Rules
- Archival Collage Images
- Lottie Box Intersect
- OGraf Card Param
- OGraf Text Param
- Full Output Enforcement
- Onboard & Empty States
- Thumbnail Video Skill
- Studio Share Preview
- Remotion Sync Script
- Loudness Fix Script
- RGB Shift Shader
- Vignette Shader
- Audio Enhance Script
- Encode Script
- Master Script
- Contact Sheet Script
- DaVinci Reels Clips
- Lottie Animation Lookup
- Lottie Proxy Functions

## God Nodes (most connected - your core abstractions)
1. `makeCtx()` - 48 edges
2. `connectSSE()` - 34 edges
3. `setLiveState()` - 33 edges
4. `resumeSession()` - 33 edges
5. `showToast()` - 31 edges
6. `initGlobalBar()` - 30 edges
7. `el()` - 29 edges
8. `buildInsertConfigureRow()` - 27 edges
9. `handleKeyDown()` - 27 edges
10. `cleanup()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Sports Hub On-screen Facts` --semantically_similar_to--> `Facts List (facts.md)`  [INFERRED] [semantically similar]
  sports-hub-promo/overlays/facts.md → .claude/skills/video-ad-editor/references/motion-rules.md
- `Animation Build Sequence` --semantically_similar_to--> `Expo Animation Build Sequence`  [INFERRED] [semantically similar]
  .claude/skills/animate/SKILL.md → .claude/skills/animate-expo/SKILL.md
- `Kinetic text` --semantically_similar_to--> `Arabic Word FX + Caption Styles`  [INFERRED] [semantically similar]
  .claude/skills/video-motion-editing/SKILL.md → .claude/skills/video-ad-editor/references/word-fx.md
- `glitch()` --indirect_call--> `W()`  [INFERRED]
  .claude/skills/video-ad-editor/scripts/compose.EXAMPLES.js → .claude/skills/impeccable/scripts/modern-screenshot.umd.js
- `setup()` --references--> `y`  [EXTRACTED]
  sports-hub-promo/overlays/scenes/ticket.js → .claude/skills/video-ad-editor/scripts/davinci/ograf_titles/mk-caption.ograf.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Impeccable build agent pipeline (produce assets, review, document)** — _claude_agents_impeccable_asset_producer_impeccable_asset_producer, _claude_agents_impeccable_finish_reviewer_impeccable_finish_reviewer, _claude_agents_impeccable_documenter_impeccable_documenter, _claude_agents_impeccable_manual_edit_applier_impeccable_manual_edit_applier [INFERRED 0.85]
- **Emil Kowalski motion skill family** — _claude_skills_animate_skill_animate_skill, _claude_skills_animate_expo_skill_animate_expo_skill, _claude_skills_animation_vocabulary_skill_animation_vocabulary_skill, _claude_skills_apple_design_skill_apple_design_skill [INFERRED 0.85]
- **Reduced-motion accessibility across motion skills** — _claude_skills_animate_skill_reduced_motion_pointer_gating, _claude_skills_animate_expo_skill_reduced_motion, _claude_skills_apple_design_skill_reduced_motion [INFERRED 0.85]
- **Anti-AI-slop forbidden-pattern rule sets** — _claude_skills_design_taste_frontend_v1_skill_ai_tells, _claude_skills_high_end_visual_design_skill_absolute_zero_directive, _claude_skills_image_to_code_skill_anti_ai_slop, _claude_skills_imagegen_frontend_web_skill_anti_ai_slop, _claude_skills_imagegen_frontend_mobile_skill_mobile_anti_ai_tells [INFERRED 0.85]
- **Image-first design generation pipeline** — _claude_skills_image_to_code_skill_skill, _claude_skills_imagegen_frontend_web_skill_skill, _claude_skills_imagegen_frontend_mobile_skill_skill [INFERRED 0.85]
- **Layout variance / randomization engines** — _claude_skills_gpt_taste_skill_python_randomization, _claude_skills_high_end_visual_design_skill_creative_variance_engine, _claude_skills_image_to_code_skill_combinatorial_variation_engine, _claude_skills_imagegen_frontend_mobile_skill_style_variation_engine [INFERRED 0.75]
- **Refinement commands that hand off to /impeccable polish** — _claude_skills_impeccable_reference_adapt, _claude_skills_impeccable_reference_animate, _claude_skills_impeccable_reference_bolder, _claude_skills_impeccable_reference_clarify, _claude_skills_impeccable_reference_colorize, _claude_skills_impeccable_reference_delight, _claude_skills_impeccable_reference_distill, _claude_skills_impeccable_reference_harden [EXTRACTED 1.00]
- **Degraded inline subagent roles** — _claude_skills_impeccable_reference_degraded_asset_producer, _claude_skills_impeccable_reference_degraded_documenter, _claude_skills_impeccable_reference_degraded_finish_reviewer, _claude_skills_impeccable_reference_degraded_manual_edit_applier [EXTRACTED 1.00]
- **Comp-led build pipeline (spec, plates, review, diff)** — _claude_skills_impeccable_reference_component_review_comp_spec, _claude_skills_impeccable_reference_component_review_plates, _claude_skills_impeccable_reference_component_review_component_review_cli, _claude_skills_impeccable_reference_degraded_finish_reviewer_comp_diff, _claude_skills_impeccable_reference_degraded_finish_reviewer_build_state [INFERRED 0.85]
- **Impeccable Visitor Mode Rule Sets** — _claude_skills_impeccable_reference_mode_operate, _claude_skills_impeccable_reference_mode_persuade, _claude_skills_impeccable_reference_mode_read, _claude_skills_impeccable_reference_mode_operate_concept_seed [EXTRACTED 1.00]
- **New Work Pipeline (init, shape, visualize, region map)** — _claude_skills_impeccable_reference_init, _claude_skills_impeccable_reference_shape, _claude_skills_impeccable_reference_new_work, _claude_skills_impeccable_reference_visualize, _claude_skills_impeccable_reference_region_map [EXTRACTED 1.00]
- **Animation Audit Eight Categories** — _claude_skills_improve_animations_audit_purpose_frequency, _claude_skills_improve_animations_audit_easing_duration, _claude_skills_improve_animations_audit_physicality_origin, _claude_skills_improve_animations_audit_interruptibility, _claude_skills_improve_animations_audit_performance, _claude_skills_improve_animations_audit_accessibility, _claude_skills_improve_animations_audit_cohesion_tokens, _claude_skills_improve_animations_audit_missed_opportunities [EXTRACTED 1.00]
- **Talking-video Reel Production Pipeline** — _claude_skills_video_ad_editor_skill_cut_plan, _claude_skills_video_ad_editor_skill_word_timed_transcription, _claude_skills_video_ad_editor_skill_captions, _claude_skills_video_ad_editor_skill_scene_design, _claude_skills_video_ad_editor_skill_sfx, _claude_skills_video_ad_editor_skill_loudness_calibration [EXTRACTED 1.00]
- **Skills Sharing the video-ad-editor Engine** — _claude_skills_video_ad_editor_skill_skill, _claude_skills_podcast_video_skill_skill, _claude_skills_thumbnail_video_skill_skill [EXTRACTED 1.00]
- **Design-engineering skill family (prototype/review/pick)** — _claude_skills_prototype_skill_skill, _claude_skills_review_animations_skill_skill, _claude_skills_pick_ui_library_skill_skill [EXTRACTED 1.00]
- **Podcast reel pipeline** — claude_skills_video_ad_editor_scripts_15_podcast, claude_skills_video_ad_editor_scripts_16_render_pod, claude_skills_video_ad_editor_scripts_22_hook, claude_skills_video_ad_editor_scripts_hook_card, _claude_skills_video_ad_editor_scripts_compose_podcast [INFERRED 0.85]
- **Person cutout matting flow** — _claude_skills_video_ad_editor_references_phone_cloud_playbook_modnet, _claude_skills_video_ad_editor_references_phone_cloud_playbook_background_difference_matting, _claude_skills_video_ad_editor_references_phone_cloud_playbook_temporal_mask_smoothing [EXTRACTED 1.00]
- **Studio editing layer over skill files** — _claude_skills_video_ad_editor_references_studio_studio_py, _claude_skills_video_ad_editor_studio_studio_mobile, _claude_skills_video_ad_editor_studio_studio_share, _claude_skills_video_ad_editor_references_studio_studio_json, _claude_skills_video_ad_editor_scripts_compose_reference [INFERRED 0.85]
- **Remotion Studio Ad composition screenshots** — _claude_skills_video_ad_editor_img_studio_guides_remotion_studio_guides, _claude_skills_video_ad_editor_img_studio_remotion_studio, _claude_skills_video_ad_editor_img_timeline_remotion_timeline [INFERRED 0.95]
- **Archival B&W collage images** — _claude_skills_video_ad_editor_scripts_collage_assets_bug_note_first_bug_logbook, _claude_skills_video_ad_editor_scripts_collage_assets_cards_bw_punch_card_archive, _claude_skills_video_ad_editor_scripts_collage_assets_mcc_bw_mission_control_photo [INFERRED 0.85]

## Communities (171 total, 31 thin omitted)

### Community 0 - "Impeccable Live Browser Core"
Cohesion: 0.03
Nodes (118): addManualContextText(), applyEditing(), applyGlobalBarLabelState(), applyLiveBarPreference(), applyOriginalAttrsToSvelteAnchor(), applyPlaceholderSizingStyles(), averageRgb01(), bindEditBadgeProxy() (+110 more)

### Community 1 - "Lottie SVG Runtime"
Cohesion: 0.02
Nodes (24): addDecorator(), addEffect(), createQuaternion(), EffectsManager(), extrema(), getValueAtCurrentTime(), GroupEffect(), hslToRgb() (+16 more)

### Community 2 - "Motion Engine & Story Scenes"
Cohesion: 0.05
Nodes (88): activeWord(), applyFont(), barIndex(), barPulse(), baseT(), beatIndex(), beatPhase(), beatPulse() (+80 more)

### Community 3 - "Live Params Panel"
Cohesion: 0.06
Nodes (90): abortSvelteComponentInjection(), applyParamDefaults(), applyParamValue(), applySavedSessionMeta(), buildParamsPanel(), checkpointPayload(), clampVariantIndex(), clearSession() (+82 more)

### Community 4 - "Lottie Graphics Library (Py)"
Cohesion: 0.07
Nodes (29): arc(), caption(), coin_rain(), Doc, end_card(), F(), Face, _find_font() (+21 more)

### Community 5 - "Three.js SVG Loader"
Cohesion: 0.06
Nodes (44): addStops(), buildGradientTexture(), computeLocalBBox(), SVGLoader, eigenDecomposition(), getNodeTransform(), getReflection(), getTransformScale() (+36 more)

### Community 6 - "Live Configure Bar"
Cohesion: 0.07
Nodes (56): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+48 more)

### Community 7 - "Cut, Zoom & Backdrop Scripts"
Cohesion: 0.07
Nodes (21): _hdr_to_sdr(), main(), arg(), chrome(), dur(), hexc(), main(), badge() (+13 more)

### Community 8 - "Live Agent Steering"
Cohesion: 0.08
Nodes (54): agentHasWorkInFlight(), armPageChatForTyping(), attachSteerFocusDebug(), attachSteerFocusGuard(), buildSteerProcessingDots(), buildSteerQueueHint(), clearSteerAwaitTimer(), clearSteerFocusRecoverTimer() (+46 more)

### Community 9 - "Lottie Minified Internals"
Cohesion: 0.10
Nodes (36): a(), n(), addPropertyDecorator(), e(), i(), l(), r(), s() (+28 more)

### Community 10 - "Design Taste Frontend Rules"
Cohesion: 0.05
Nodes (5): design-taste-frontend (tasteskill Anti-Slop Frontend Skill), design-taste-frontend-v1 (High-Agency Frontend Skill), gpt-taste (Awwwards-Level Design Engineering), high-end-visual-design (Principal UI/UX Architect & Motion Choreographer), impeccable (frontend design skill v4.5.2)

### Community 11 - "Live Edit Lifecycle"
Cohesion: 0.12
Nodes (44): beginNewLiveConfiguration(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanupAcceptedSession(), clearAnnotations(), clearInsertPicking(), closeTunePopover() (+36 more)

### Community 12 - "OGraf Headline Schema"
Cohesion: 0.05
Nodes (42): default, gddType, pattern, title, type, default, title, type (+34 more)

### Community 13 - "Live UI Chrome & Theming"
Cohesion: 0.09
Nodes (39): agentStatusText(), barPaletteForTheme(), brandMarkSvg(), cursorForInsertAxis(), designPanelCss(), detectPageTheme(), own(), pickable() (+31 more)

### Community 14 - "Live Session Recovery"
Cohesion: 0.08
Nodes (39): abandonForeignSession(), abandonSupersededGo(), cleanup(), clearHandled(), clearMountErrorCard(), clearScrollY(), componentModuleCandidates(), describeMountFailure() (+31 more)

### Community 15 - "Design Panel Builders"
Cohesion: 0.07
Nodes (40): buildCollapsible(), buildColorModels(), buildDesignHeader(), buildListHtml(), buildRadiiModels(), buildTypographyModels(), copyToClipboard(), cssSafe() (+32 more)

### Community 16 - "Studio Server"
Cohesion: 0.14
Nodes (24): f(), default_scenes(), do_behind(), do_broll(), do_cutout(), do_drop(), do_recut(), do_render() (+16 more)

### Community 17 - "Animation Decision Philosophy"
Cohesion: 0.05
Nodes (19): emil-design-eng (Design Engineering, Emil Kowalski), find-animation-opportunities, Optimize Reference, Core Web Vitals (LCP, INP, CLS), Overdrive Reference, Animation Audit Playbook, Audit: Accessibility, Audit: Cohesion & Tokens (+11 more)

### Community 18 - "UI Library Picks & Anim Review"
Cohesion: 0.07
Nodes (34): base-ui, clsx, cmdk, Cobe, cva, dnd kit, input-otp, Leva (+26 more)

### Community 19 - "Talking Avatar & Assets"
Cohesion: 0.10
Nodes (21): Talking Avatar Scene, Kling avatar lip-sync, video-layer scene in compose, api(), search(), cost(), _dl(), frames_of() (+13 more)

### Community 20 - "Onboarding Server"
Cohesion: 0.11
Nodes (16): atomic_write(), clean(), contrast(), fix_on_acc(), Handler, load_profile(), log(), _lum() (+8 more)

### Community 21 - "Hook Overlay Pipeline"
Cohesion: 0.12
Nodes (19): apply(), check(), devices(), hook_cfg(), inject(), load_sentences(), norm(), nums_in() (+11 more)

### Community 22 - "Podcast Multi-Cam Mode"
Cohesion: 0.13
Nodes (21): Podcast Mode (multi-camera), 24_podcast_wide.py full episode 16:9, Audio-based camera sync + speaker detection, Four podcast modes (split/full/etc.), caption_spot(), defects(), envelope(), face_stats() (+13 more)

### Community 23 - "Montage Builder"
Cohesion: 0.14
Nodes (21): cmd_build(), cmd_pick(), cmd_plan(), cmd_scan(), one(), cmd_sheet(), cmd_show(), cmd_undo() (+13 more)

### Community 24 - "Live Insert & Annotation"
Cohesion: 0.11
Nodes (29): applyPlaceholderDimensions(), beginEditPin(), buildAnnotationsForCapture(), buildInsertPlaceholderSnapshotFromDom(), buildPickedAnchorSnapshot(), buildPinElement(), cancelEditingPin(), captureAndEmit() (+21 more)

### Community 25 - "SFX Synthesis"
Cohesion: 0.16
Nodes (20): env_ad(), click(), glitch(), lp(), pop(), riser(), shimmer(), sub() (+12 more)

### Community 26 - "Procedural Audio FX"
Cohesion: 0.24
Nodes (8): filt(), norm(), reverb(), SFX, sine(), sos(), st(), sweep()

### Community 27 - "Cut Plan & Captions"
Cohesion: 0.08
Nodes (6): find_dupes(), load(), _norm(), save(), _sim(), _words()

### Community 28 - "Music Bed Synth"
Cohesion: 0.14
Nodes (20): build_bed(), fb(), pluck(), db(), limiter(), loudnorm(), main(), measure() (+12 more)

### Community 29 - "Asset Producer Agent"
Cohesion: 0.10
Nodes (22): impeccable comp-spec command, Decision Comps Job, Impeccable Asset Producer Agent, Asset Producer Output Contract, Raster Plate, Measured Spec (.impeccable/build/spec.json), Transparent Cutout vs Opaque Plate, DESIGN.md Design System Record (+14 more)

### Community 30 - "Manual Edit Apply Dock"
Cohesion: 0.18
Nodes (26): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+18 more)

### Community 31 - "Image-Gen Design Rules"
Cohesion: 0.09
Nodes (3): image-to-code (Image-First Website Design to Code), imagegen-frontend-mobile (Premium Mobile App Image Direction), imagegen-frontend-web (Awwwards-Level Image Art Direction)

### Community 32 - "Semantic Shot Search"
Cohesion: 0.16
Nodes (15): cmd_find(), cmd_index(), die(), duration(), Embedder, flag(), grab(), load_index() (+7 more)

### Community 33 - "Beat Detection"
Cohesion: 0.15
Nodes (13): band_edges(), die(), estimate_tempo(), flag(), grid_beats(), grid_fit(), load_audio(), main() (+5 more)

### Community 34 - "Lottie Expressions"
Cohesion: 0.10
Nodes (13): i(), initialize$2(), initiateExpression(), applyEase(), ease(), easeIn(), easeOut(), executeExpression() (+5 more)

### Community 35 - "OGraf Background Schema"
Cohesion: 0.09
Nodes (22): default, gddType, pattern, title, type, description, default, title (+14 more)

### Community 36 - "Impeccable Init & Modes"
Cohesion: 0.14
Nodes (19): Craft (deprecated alias), Init Flow, PRODUCT.md, Operate Mode Rules, impeccable concept-seed MODE RULES, Persuade and Experience Mode Rules, Read Mode Rules, New Visual Work Flow (+11 more)

### Community 37 - "Voiceover & Alignment"
Cohesion: 0.16
Nodes (11): align(), decode(), main(), norm(), run(), split_words(), trim(), tts() (+3 more)

### Community 38 - "Puppeteer Demo Recorder"
Cohesion: 0.10
Nodes (17): dependencies, puppeteer-core, BASE, cam(), cfgPath, D, ease(), frames (+9 more)

### Community 39 - "Audio Denoise"
Cohesion: 0.16
Nodes (13): atten_db(), dfn_clean(), die(), ff(), find_dfn(), flag(), lag_of(), main() (+5 more)

### Community 40 - "Bolder & Clarify Commands"
Cohesion: 0.11
Nodes (18): Bolder Command, Skeleton test, Clarify Command, Message hierarchy, Critique Command, Cognitive Load Assessment, impeccable critique-storage snapshot, Heuristics Scoring Guide (+10 more)

### Community 41 - "Craft Floor & Doctor"
Cohesion: 0.15
Nodes (20): Craft Floor, Craft floor refusals, Impeccable Documenter (degraded), Doctor Command, impeccable doctor --json/--fix, Drift types (truth drift vs artifact drift), Document Command (DESIGN.md), Creative North Star (+12 more)

### Community 42 - "Motion Mode & Screen Rec"
Cohesion: 0.12
Nodes (18): Motion Mode (film from text), Motion engine (motion/README.md, ENGINE-API.md), Screen Recording in Phone Frame, Phone-frame screen recording, Web/App Explainer in Motion, 30_demo.js cinematic demo, 31_device3d.js 3D devices, url() (+10 more)

### Community 43 - "Frame Renderer (render.js)"
Cohesion: 0.10
Nodes (18): argv, CRF, encode(), ffmpeg(), flag(), fs, http, LOGOS (+10 more)

### Community 44 - "3D Device Scene Script"
Cohesion: 0.10
Nodes (17): BASE, cam(), cfgPath, D, ease(), frames, fs, http (+9 more)

### Community 45 - "Timeline Builder"
Cohesion: 0.16
Nodes (12): main(), read_wav(), write_wav(), bn(), ding(), env(), paper(), tap() (+4 more)

### Community 46 - "Live Browser DOM Helpers"
Cohesion: 0.16
Nodes (13): createLiveBrowserDomHelpers(), cloneWithoutChrome(), cssId(), liveUiRoot(), makeFrozenAnchor(), raiseHitModal(), rectIsUsableAnchor(), syncTopLayerHost() (+5 more)

### Community 47 - "Compose Example Widgets"
Cohesion: 0.12
Nodes (7): CH, EXAMPLE_LAYOUT, EXAMPLE_SCENES, glitch(), rtlBug(), rtlFix(), titleChip()

### Community 48 - "Lottie Shot Renderer"
Cohesion: 0.12
Nodes (12): { execFileSync }, fs, os, path, ./main.js, { execFileSync }, fs, http (+4 more)

### Community 49 - "Lottie Path Geometry"
Cohesion: 0.12
Nodes (19): crossProduct(), floatEqual(), floatZero(), getIntersection(), joinLines(), lerp(), lerpPoint(), linearOffset() (+11 more)

### Community 50 - "Colorize & Edit Applier"
Cohesion: 0.13
Nodes (17): Colorize Command, Color strategy (hierarchy, meaning, atmosphere), Live-mode signature params, Impeccable Manual Edit Applier (degraded), manual_edit_apply live event, Generate Command (live fast lane), Accept and carbonize variant, impeccable live-generate / live-poll (+9 more)

### Community 51 - "Motion Rules & Pre-export"
Cohesion: 0.12
Nodes (15): Motion Rules + Facts List + Pre-export Check, theme.json identity file, Scene Design (Step 7), B-roll (optional), Motion kit (motion-kit.js), 08_safe_check.js safe-zone check, 00_theme_refs.py identity from refs, Caption styles (capStyle) (+7 more)

### Community 52 - "Live Session State"
Cohesion: 0.22
Nodes (15): createLiveBrowserSessionState(), clearHandled(), clearScrollY(), clearSession(), isHandled(), loadSession(), markHandled(), nextCheckpointRevision() (+7 more)

### Community 53 - "Person Masks & Scopes"
Cohesion: 0.18
Nodes (11): ensure_masks(), apply_fx(), build_fx(), die(), duration(), flag(), frames(), main() (+3 more)

### Community 54 - "Brandkit Skill"
Cohesion: 0.16
Nodes (16): Anti-Generic Rules, Board Composition DNA, brandkit Skill, Color Discipline, Construction Geometry, 2x3 Reference-Style Layout, Logo Concept Methods, Metaphor Fusion (+8 more)

### Community 55 - "Mobile Native & iOS"
Cohesion: 0.12
Nodes (14): iOS Platform Reference, Operate Mode Depth, mobile-native Skill (Feeling Native on Mobile), 100vh Wrong Height Bug, Carousel Scroll Direction, Hover State Stuck After Tap, Input Zoom, Laggy Tap (+6 more)

### Community 56 - "Agent Target Claiming"
Cohesion: 0.29
Nodes (17): actOnAgentTarget(), agentTargetBusyReason(), agentTargetOverlayGone(), agentTargetTaken(), claimAgentTarget(), claimAndActOnAgentTarget(), declineAgentTargetBusy(), declineAgentTargetUnresolvable() (+9 more)

### Community 57 - "Three.js Mask Pass"
Cohesion: 0.15
Nodes (4): ClearMaskPass, MaskPass, Pass, RenderPass

### Community 58 - "Break-UI Data Catalog"
Cohesion: 0.12
Nodes (15): Collections, Emails, URLs, identifiers, Environment, Images and media, Labels, titles, copy from data, Numbers and money, People and names, States (+7 more)

### Community 59 - "Video Editor Env & Backdrop"
Cohesion: 0.12
Nodes (15): Any Environment (phone/cloud/Windows/Linux), Audio Enhance (step 3.5), Dimmed Cinematic Backdrop (7.75), Collage Paper Cutout Style (7.8), Generated Scenes (7.9, gen.json), gen.json Assets & Scenes Spec, Step 5 Correction & Arabic Captions, Step 3 Cut Plan (+7 more)

### Community 60 - "Screenshot Lib (minified)"
Cohesion: 0.24
Nodes (14): Ct(), dt(), Et(), ft(), It(), J(), ne(), Se() (+6 more)

### Community 61 - "Screenshot Lib Internals A"
Cohesion: 0.16
Nodes (16): bt(), Ce(), s(), Ee(), ht(), L(), l(), me() (+8 more)

### Community 62 - "Three.js Geometry Utils"
Cohesion: 0.15
Nodes (7): computeMikkTSpaceTangents(), computeMorphedAttributes(), deepCloneAttribute(), deinterleaveAttribute(), deinterleaveGeometry(), mergeAttributes(), mergeGeometries()

### Community 63 - "Text-Behind-Person Render"
Cohesion: 0.14
Nodes (13): caps, cp, fs, gone, isStack(), kept, lines, meta (+5 more)

### Community 64 - "Beat FX Renderer"
Cohesion: 0.14
Nodes (10): A, CHECK, { execFileSync, spawnSync }, fileURL(), fs, has(), makeSheet(), path (+2 more)

### Community 66 - "Animation Vocabulary"
Cohesion: 0.13
Nodes (15): animation-vocabulary Skill, Easing, Entrances & Exits, Feedback & Interaction, Looping & Ambient Motion, Movement & Transforms, Animation Performance, Polish & Effects (+7 more)

### Community 67 - "Three.js Text Geometry"
Cohesion: 0.17
Nodes (5): TextGeometry, createPath(), createPaths(), Font, FontLoader

### Community 68 - "Three.js Effect Composer"
Cohesion: 0.23
Nodes (6): _camera, FullscreenTriangleGeometry, _geometry, AfterimageShader, CopyShader, LuminosityHighPassShader

### Community 69 - "Theme Color Extraction"
Cohesion: 0.27
Nodes (11): contrast(), hx(), kmeans(), lum(), main(), mix(), pick(), pixels() (+3 more)

### Community 70 - "Lottie Vector Math"
Cohesion: 0.21
Nodes (15): $bm_isInstanceOfArray(), $bm_neg(), div(), getPerpendicularVector(), getProjectingAngle(), isNumerable(), length(), mul() (+7 more)

### Community 71 - "Android & Animate Ref"
Cohesion: 0.19
Nodes (12): Android Platform Reference, Android slop test, Material Design 3, Animate Command, Visitor mode, Audit (web), Audit Health Score, Implementation Integrity verdict (+4 more)

### Community 72 - "Swift Vision Tracking"
Cohesion: 0.19
Nodes (6): AVFoundation, P(), pump(), CoreImage, Foundation, Vision

### Community 73 - "Svelte DOM Commit"
Cohesion: 0.23
Nodes (14): acceptedDomAlreadyClean(), clearHandledWrapperReloadStamp(), commitAcceptedSvelteComponentToDom(), deferredRecoverySuperseded(), ensureAcceptedDomClean(), findAcceptedRuntimeWrappers(), getMountedSvelteComponentAnchor(), handledWrapperReloadKey() (+6 more)

### Community 74 - "Long-Form Transcription"
Cohesion: 0.19
Nodes (4): run(), tr(), audio(), quietest()

### Community 76 - "Web Animation Recipes"
Cohesion: 0.15
Nodes (13): Tab / segmented indicator, Accordion / collapse, Animation Recipes (web), Drawer / sheet, Dropdown / popover / menu, Hold to confirm, Masking a crossfade, Modal (+5 more)

### Community 77 - "Sonner Toasts"
Cohesion: 0.18
Nodes (11): Toast (Expo), Toast recipe, Sonner API Reference, toast.custom (headless), toast() function, toast.promise, <Toaster /> component, useSonner hook (+3 more)

### Community 78 - "Expo Animation Skill"
Cohesion: 0.15
Nodes (12): 120fps, animate-expo Skill, Expo Animation Build Sequence, React Native Gesture Handler, Haptics (expo-haptics), Press, Not Hover, React Native Reanimated, Reduced Motion and Accessibility (Expo) (+4 more)

### Community 79 - "Podcast Written Hook"
Cohesion: 0.24
Nodes (8): Podcast Written Hook, 6 hook formulas, draw(), layout(), place(), rr(), split(), tokens()

### Community 80 - "Three.js FXAA Pass"
Cohesion: 0.19
Nodes (3): FXAAPass, ShaderPass, FXAAShader

### Community 81 - "Beat FX Drawing"
Cohesion: 0.27
Nodes (11): sh(), buf(), channel(), draw(), footageColor(), redraw(), snap(), splitDraw() (+3 more)

### Community 82 - "Beat FX Layer API"
Cohesion: 0.24
Nodes (6): BFX, norm(), pick(), push(), rng(), since()

### Community 86 - "Expo Animation Recipes"
Cohesion: 0.17
Nodes (12): Bottom sheet drag to dismiss, Collapsing header on scroll, Expo Animation Recipes, Keyboard-synced UI, List entrances, Press feedback, Screen transitions (Expo Router), Swipe to delete row (+4 more)

### Community 87 - "Apple Springs & Gestures"
Cohesion: 0.17
Nodes (12): Timing or Spring, Spring Animations, apple-design Skill, Behavior over animation - springs, Direct manipulation 1:1 tracking, Design foundations - eight principles, Materials & depth (translucency), Momentum projection (+4 more)

### Community 88 - "Reel Frame Screenshots"
Cohesion: 0.20
Nodes (12): Behind-the-scenes hook frame (0% manual editing), @majed_alzaabi_ handle badge with starburst logo, Kinetic Arabic hook title with orange highlight word, Rounded caption card with word-level highlight, Final reel frame: word-level sync SFX, Word-level audio/SFX sync with waveform graphic, 9:16 platform safe-zone overlay (red UI-obscured areas), Remotion 'Ad' composition (AbsoluteFill, video.mp4, logo.png) (+4 more)

### Community 89 - "Studio & Arabic Word FX"
Cohesion: 0.18
Nodes (6): Studio (mobile/browser), studio.json edit overrides, studio/studio.py server, Arabic Word FX + Caption Styles, Layers hook style, Studio Mobile Editor

### Community 90 - "Write Swift Skill"
Cohesion: 0.21
Nodes (12): Write Swift Skill, Actor reentrancy, API design guidelines, ARC and object lifetime, Macros, Sendable, some vs any, Structured concurrency (+4 more)

### Community 91 - "Three.js Output Pass"
Cohesion: 0.20
Nodes (3): OutputPass, FullScreenQuad, OutputShader

### Community 92 - "Frame Render Script"
Cohesion: 0.17
Nodes (6): CFG, CHROME, fs, HASCOVER, path, {pathToFileURL}

### Community 93 - "Safe-Area Checker"
Cohesion: 0.17
Nodes (8): caps, CFG, CHROME, DEF, fs, path, {pathToFileURL}, SHOT

### Community 94 - "Collage Renderer"
Cohesion: 0.17
Nodes (10): args, CAPS, cfg, cp, fs, li, logos, N (+2 more)

### Community 96 - "Asset Review & Plates"
Cohesion: 0.27
Nodes (11): Plan and Asset Review, impeccable comp-spec regions/plates, impeccable component-review (plan/capture/serve/verify), Raster plates, Impeccable Asset Producer (degraded), Decision Comps, impeccable generate-image / embed-prompt, Impeccable Finish Reviewer (degraded) (+3 more)

### Community 97 - "Montage & Motion Skills"
Cohesion: 0.22
Nodes (9): montage-video Skill (beat-cut montage), Cut on Audio Beats (9:16), motion-video Skill (3D motion graphics film), 3D iPhone/MacBook Website Explainer, theme.json Colors Only, Start: tools, taste, identity, 00_setup.sh silent setup, Running Skill on Windows (+1 more)

### Community 98 - "Redesign & Stitch Taste"
Cohesion: 0.20
Nodes (7): Design Audit (Typography, Color, Layout, States, Content, Components, Icons, Code), redesign-existing-projects Skill, Upgrade Techniques, Configuration Dials (Creativity, Density, Motion), Design System: Taste Standard, Google Stitch, stitch-design-taste Skill

### Community 99 - "Phone & Cloud Playbook"
Cohesion: 0.24
Nodes (10): Phone & Cloud Playbook, Reference-background difference matting, faster-whisper Arabic transcription, HDR to SDR ffmpeg recipe, J-cut (audio leads cut), MODNet person matting (ONNX), Silence cutting rule, Temporal mask smoothing [1,2,3,2,1]/9 (+2 more)

### Community 101 - "Podcast Renderer"
Cohesion: 0.18
Nodes (7): cams, caps, faces, fs, path, {pathToFileURL}, plan

### Community 102 - "Lottie SVG Effects"
Cohesion: 0.18
Nodes (11): createNS(), ShapeGroupData(), SVGDropShadowEffect(), SVGFillFilter(), SVGGaussianBlurEffect(), SVGMatte3Effect(), SVGProLevelsFilter(), SVGRenderer() (+3 more)

### Community 103 - "Animate Skill Core"
Cohesion: 0.27
Nodes (7): animate Skill, Animation Purpose, Animation Build Sequence, Easing, Duration, or Spring, Emil Kowalski Animation Philosophy, Interruption and Exit, Never Ship List

### Community 104 - "3D Device Renderer"
Cohesion: 0.20
Nodes (7): 3D Device Renderer (iPhone/MacBook), ctx Reference, Motion Engine API, Motion Pipeline (script, voice, scenes, sound, 60fps MP4), Scene Contract, Motion Engine Runtime Page, Motion Explainer Film From Text (README)

### Community 105 - "Podcast Pipeline Upgrades"
Cohesion: 0.24
Nodes (5): Podcast Pipeline Upgrades (vs SupoClip), 20_episode_cuts.py episode to reels, 23_rank_clips.py clip ranking, SupoClip (compared project), Podcast Compose Renderer

### Community 106 - "Lottie Masks & Shapes"
Cohesion: 0.20
Nodes (10): S, createSizedArray(), DashProperty(), MaskElement(), ShapeCollection(), ShapePath(), SVGCompElement(), SVGGradientStrokeStyleData() (+2 more)

### Community 107 - "OGraf Caption Manifest"
Cohesion: 0.20
Nodes (9): description, id, main, name, stepCount, supportsNonRealTime, supportsRealTime, v_bmd (+1 more)

### Community 108 - "Brutalist & Minimalist UI"
Cohesion: 0.22
Nodes (8): Industrial Brutalism & Tactical Telemetry UI, Analog Degradation Post-processing, Swiss Industrial Print Archetype, Tactical Telemetry & CRT Terminal Archetype, Macro/Micro Typographic Architecture, Premium Utilitarian Minimalism UI, Flat Bento Grids, Warm Monochrome + Spot Pastels Palette

### Community 109 - "Arabic Font Licenses"
Cohesion: 0.22
Nodes (9): Aref Ruqaa font, Cairo font, IBM Plex Sans Arabic font, Inter font, Lalezar font, Noto Kufi Arabic font, SIL Open Font License Bundle, Readex Pro font (+1 more)

### Community 110 - "Sports Hub Promo Facts"
Cohesion: 0.25
Nodes (8): Sports Hub On-screen Facts, ACWR danger threshold 1.5 (Gabbett 2016), Sports Hub Promo Overlays, ACWR gauge overlay, Logo reveal overlay, Screen blend compositing, Speed HUD overlay, VIP ticket overlay

### Community 111 - "Creator Onboarding"
Cohesion: 0.25
Nodes (5): Onboarding Page, 00_onboard.py onboarding launcher, Creator profile (profile.json / creator-profile.md), Generated voice via edge-tts, Legacy Timeline Studio

### Community 112 - "Remotion & Script Map"
Cohesion: 0.25
Nodes (9): Remotion Edit Screen (second engine), 04b_remotion.sh Remotion engine, Script & File Map, 04_render_frames.js frame renderer, Reference Compose Renderer, R_COLLAGE, R_STAGE, SCENE_LIST (+1 more)

### Community 113 - "Screenshot Lib Internals B"
Cohesion: 0.31
Nodes (9): de(), Ie(), Lt(), Mt(), oe(), Ot(), qt(), Re() (+1 more)

### Community 114 - "Screenshot Lib Internals C"
Cohesion: 0.36
Nodes (9): er(), fe(), jt(), k(), Kt(), tr(), v(), x() (+1 more)

### Community 115 - "Wide Podcast Render"
Cohesion: 0.31
Nodes (5): arg(), fit_vf(), plan(), prep(), render()

### Community 116 - "OGraf Numeric Params"
Cohesion: 0.22
Nodes (7): y, default, maximum, minimum, title, type, setup()

### Community 117 - "Layout & Visitor Modes"
Cohesion: 0.32
Nodes (4): Layout Reference, Live-mode Signature Params, Quieter Reference, Typeset Reference

### Community 118 - "Collage Template & Assets"
Cohesion: 0.25
Nodes (4): Collage Assets Licenses, Public-domain collage images (Wikimedia), Collage Template Renderer, BRANDS

### Community 119 - "Setup Script"
Cohesion: 0.46
Nodes (7): extras_status(), find_chrome(), have(), line(), pipi(), pipx2(), 00_setup.sh script

### Community 120 - "Lottie Seeded Random"
Cohesion: 0.25
Nodes (6): g(), l(), random(), seedRandom(), m(), u()

### Community 121 - "Manual Edit Applier Agent"
Cohesion: 0.29
Nodes (7): Coupled Lookup Key Updates, Entry Atomicity, Impeccable Manual Edit Applier Agent, manual_edit_apply Event Batch, Apply Result JSON Contract (done/partial/error), Repair Mode, Source Hint Evidence Order

### Community 122 - "Adapt Commands"
Cohesion: 0.33
Nodes (6): Adapt (web), Adapt (native), Platform-to-platform adaptation (iOS <-> Android), Web to native porting, Print and Email Adaptation, Responsive Design reference (formerly responsive-design.md)

### Community 123 - "Live Ignore Rules"
Cohesion: 0.52
Nodes (6): globToRegex(), matchesScope(), normalizeIgnoreRule(), normalizeIgnoreValue(), pageCandidates(), resolveDetectIgnores()

### Community 124 - "Screenshot Lib Internals D"
Cohesion: 0.29
Nodes (7): ae(), be(), _e(), Gt(), P(), q(), W()

### Community 126 - "OGraf Schema Header"
Cohesion: 0.29
Nodes (7): default, title, type, hot, $schema, properties, type

### Community 127 - "DaVinci Video Skill"
Cohesion: 0.33
Nodes (4): davinci_editable.py editable timeline, DaVinci Resolve Studio 21.1+, davinci-video Skill, video-ad-editor shared engine

### Community 128 - "Beat & Shot Search Refs"
Cohesion: 0.33
Nodes (6): Beat Detection (beat.py), Beat FX (beat.py + beat-fx.js), Semantic Shot Search (26_find_shots.py), Numbered Contact Sheet, Montage Mode (clips without speech), Mode Router (not a talking video?)

### Community 129 - "Explainer Pace & Motion Kit"
Cohesion: 0.33
Nodes (5): Calm Pace (theme.json pace), Full Explainer R_OFF & Calm Pace, R_OFF Full Explainer Scene, Motion Kit (motion-kit.js), SFX Palette (sfx.json)

### Community 131 - "Rounded Box Geometry"
Cohesion: 0.40
Nodes (3): getUv(), RoundedBoxGeometry, _tempNormal

### Community 133 - "Shell Compat Helpers"
Cohesion: 0.40
Nodes (4): _pick_py(), PYTHONIOENCODING, PYTHONUTF8, _compat.sh script

### Community 134 - "OGraf Param Group A"
Cohesion: 0.33
Nodes (6): default, gddType, pattern, title, type, acc

### Community 135 - "OGraf Param Group B"
Cohesion: 0.33
Nodes (6): default, gddType, pattern, title, type, bg

### Community 136 - "OGraf Param Group C"
Cohesion: 0.33
Nodes (6): default, gddType, pattern, title, type, ink

### Community 137 - "OGraf Size Param"
Cohesion: 0.33
Nodes (6): size, default, maximum, minimum, title, type

### Community 138 - "Podcast Video Skill"
Cohesion: 0.60
Nodes (4): Full Episode 16:9 YouTube Mode, podcast-video Skill, Landscape to Vertical Reel (v3.5), Full Episode to Multiple Reels

### Community 139 - "Onboarding Taste Page"
Cohesion: 0.50
Nodes (3): contrast(), Onboarding Taste Page, onColor()

### Community 140 - "Inline Text Editing"
Cohesion: 0.40
Nodes (5): collectEditableTextRows(), visit(), enableInlineEdit(), onInlineInput(), wrapMixedContentTextNodes()

### Community 143 - "Lottie Color Math"
Cohesion: 0.60
Nodes (5): addBrightnessToRGB(), addHueToRGB(), addSaturationToRGB(), HSVtoRGB(), RGBtoHSV()

### Community 145 - "Text Behind Head Rules"
Cohesion: 0.50
Nodes (3): Cut Styles / Text Behind Person (7.5), Layers (three-layer sentence), Text Behind the Head

### Community 146 - "DaVinci Mode Refs"
Cohesion: 0.50
Nodes (3): DaVinci Resolve Mode, lottie_lib.py Graphics Library, OGraf Scenes in DaVinci

### Community 147 - "Cover & Thumbnail Rules"
Cohesion: 0.83
Nodes (4): Cover & Thumbnail Rules, 34_phone_preview.py legibility preview, Reel cover 1080x1920 (1:1 safe square), YouTube thumbnail 16:9

### Community 148 - "Archival Collage Images"
Cohesion: 0.50
Nodes (4): Archival computing-history collage assets, 1947 logbook page: moth in Relay #70 'first actual case of bug', B&W archive of stacked punch-card boxes, B&W mission control engineers at console

### Community 149 - "Lottie Box Intersect"
Cohesion: 0.50
Nodes (4): boxIntersect(), intersectData(), intersectsImpl(), splitData()

### Community 150 - "OGraf Card Param"
Cohesion: 0.50
Nodes (4): default, title, type, card

### Community 151 - "OGraf Text Param"
Cohesion: 0.50
Nodes (4): text, default, title, type

### Community 154 - "Thumbnail Video Skill"
Cohesion: 0.67
Nodes (3): Reel Cover 9:16 (1:1 safe square, first frame), thumbnail-video Skill, YouTube Thumbnail 16:9 (three ideas)

## Knowledge Gaps
- **235 isolated node(s):** `PYTHONUTF8`, `PYTHONIOENCODING`, `./main.js`, `AVFoundation`, `Decision Comps Job` (+230 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1041 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `W()` connect `Screenshot Lib Internals D` to `OGraf Scene Wrapper`, `Compose Example Widgets`, `Frame Render Script`, `Podcast Written Hook`, `OGraf Caption Scene`, `OGraf Headline Scene`, `Screenshot Lib (minified)`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **What connects `PYTHONUTF8`, `PYTHONIOENCODING`, `./main.js` to the rest of the system?**
  _235 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Impeccable Live Browser Core` be split into smaller, more focused modules?**
  _Cohesion score 0.034225019669551535 - nodes in this community are weakly interconnected._
- **Why does `Podcast Mode (multi-camera)` connect `Podcast Multi-Cam Mode` to `Podcast Renderer`, `Podcast Pipeline Upgrades`, `Podcast Written Hook`, `Creator Onboarding`, `Remotion & Script Map`, `Hook Overlay Pipeline`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `Lottie SVG Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.019787644787644786 - nodes in this community are weakly interconnected._
- **Why does `draw()` connect `Podcast Written Hook` to `Screenshot Lib Internals D`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Should `Motion Engine & Story Scenes` be split into smaller, more focused modules?**
  _Cohesion score 0.052407614781634936 - nodes in this community are weakly interconnected._