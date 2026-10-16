import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {EXPO, FPS, IN_OUT, WHIP, arabic, pop, tween} from './kit/theme';
import {Sfx} from './kit/kit';

const SEA = '#0E3B43';
const SEA2 = '#163238';
const PEARL = '#E8DCC4';
const CORAL = '#FF6B4A';
const S = (s: number) => Math.round(s * FPS);

export const HAYATI_TOTAL = S(30);

// ───────────── building blocks ─────────────

const Bg: React.FC = () => {
	const f = useCurrentFrame();
	const drift = Math.sin(f / 90) * 40;
	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(900px 900px at ${540 + drift}px 520px, ${SEA2} 0%, ${SEA} 62%, #0A2C33 100%)`,
			}}
		/>
	);
};

const Footnote: React.FC = () => (
	<div
		style={{
			position: 'absolute',
			bottom: 56,
			width: '100%',
			textAlign: 'center',
			fontFamily: arabic,
			fontSize: 28,
			color: PEARL,
			opacity: 0.55,
			direction: 'rtl',
		}}
	>
		* لقطات ببيانات تجريبية
	</div>
);

// Word-by-word mask reveal, RTL
const Words: React.FC<{text: string; at: number; y: number; size?: number; color?: string; out?: number; accentLast?: boolean}> = ({
	text,
	at,
	y,
	size = 92,
	color = PEARL,
	out,
	accentLast,
}) => {
	const f = useCurrentFrame();
	const words = text.split(' ');
	const exit = out ? tween(f, out, 14, 0, 1, IN_OUT) : 0;
	return (
		<div
			style={{
				position: 'absolute',
				top: y,
				left: 60,
				right: 60,
				display: 'flex',
				flexWrap: 'wrap',
				justifyContent: 'center',
				direction: 'rtl',
				gap: `0 ${size * 0.28}px`,
				opacity: 1 - exit,
				transform: `translateY(${-exit * 30}px)`,
			}}
		>
			{words.map((w, i) => {
				const p = tween(f, at + i * 6, 26);
				return (
					<span key={i} style={{display: 'inline-block', overflow: 'hidden', lineHeight: 1.35, padding: '0 4px'}}>
						<span
							style={{
								display: 'inline-block',
								fontFamily: arabic,
								fontWeight: 700,
								fontSize: size,
								color: accentLast && i === words.length - 1 ? CORAL : color,
								transform: `translateY(${(1 - p) * 120}%)`,
								opacity: p,
							}}
						>
							{w}
						</span>
					</span>
				);
			})}
		</div>
	);
};

const Phone: React.FC<{
	img: string;
	x?: number;
	y?: number;
	w?: number;
	scale?: number;
	rx?: number;
	ry?: number;
	rz?: number;
	opacity?: number;
	glow?: boolean;
}> = ({img, x = 540, y = 760, w = 560, scale = 1, rx = 0, ry = 0, rz = 0, opacity = 1, glow = true}) => {
	const h = w * (2532 / 1170);
	return (
		<div
			style={{
				position: 'absolute',
				left: x - w / 2,
				top: y - h / 2,
				width: w,
				height: h,
				opacity,
				transform: `perspective(2200px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${scale})`,
				borderRadius: 64,
				overflow: 'hidden',
				border: `6px solid ${PEARL}33`,
				boxShadow: glow
					? `0 50px 120px rgba(0,0,0,.55), 0 0 0 2px #00000055, 0 0 160px ${CORAL}22`
					: '0 50px 120px rgba(0,0,0,.55)',
				background: '#000',
			}}
		>
			<Img src={staticFile(`shots/${img}`)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
		</div>
	);
};

const Chip: React.FC<{label: string; x: number; y: number; at: number; accent?: boolean; size?: number; rot?: number}> = ({
	label,
	x,
	y,
	at,
	accent,
	size = 46,
	rot = 0,
}) => {
	const f = useCurrentFrame();
	const p = pop(f, at, 13);
	const bob = Math.sin((f + at * 3) / 22) * 8;
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y + bob,
				transform: `translate(-50%,-50%) scale(${p}) rotate(${rot}deg)`,
				padding: '18px 38px',
				borderRadius: 999,
				background: accent ? CORAL : `${PEARL}`,
				color: accent ? '#2A0E07' : SEA,
				fontFamily: arabic,
				fontWeight: 700,
				fontSize: size,
				direction: 'rtl',
				whiteSpace: 'nowrap',
				boxShadow: '0 20px 50px rgba(0,0,0,.4)',
			}}
		>
			{label}
		</div>
	);
};

const Ring: React.FC<{x: number; y: number; r: number; p: number; color: string; label: string}> = ({x, y, r, p, color, label}) => {
	const c = 2 * Math.PI * r;
	return (
		<div style={{position: 'absolute', left: x - r - 14, top: y - r - 14, width: 2 * r + 28, height: 2 * r + 28}}>
			<svg width={2 * r + 28} height={2 * r + 28} style={{transform: 'rotate(-90deg)'}}>
				<circle cx={r + 14} cy={r + 14} r={r} fill="none" stroke={`${PEARL}22`} strokeWidth={16} />
				<circle
					cx={r + 14}
					cy={r + 14}
					r={r}
					fill="none"
					stroke={color}
					strokeWidth={16}
					strokeLinecap="round"
					strokeDasharray={c}
					strokeDashoffset={c * (1 - p)}
				/>
			</svg>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontFamily: arabic,
					fontWeight: 700,
					fontSize: 34,
					color: PEARL,
					direction: 'rtl',
				}}
			>
				{label}
			</div>
		</div>
	);
};

// Logo mark: arc + ح draw themselves, coral dot lands
const Mark: React.FC<{x: number; y: number; size: number; at?: number}> = ({x, y, size, at = 0}) => {
	const f = useCurrentFrame() - at;
	const arc = tween(f, 0, 42, 0, 1, IN_OUT);
	const h = tween(f, 16, 56, 0, 1, IN_OUT);
	const dot = pop(f, 56, 11);
	return (
		<svg viewBox="0 0 512 512" width={size} height={size} style={{position: 'absolute', left: x - size / 2, top: y - size / 2}}>
			<path
				d="M 383.3 172.7 A 160 160 0 1 1 300 102.2"
				fill="none"
				stroke={PEARL}
				strokeOpacity={0.4}
				strokeWidth={22}
				strokeLinecap="round"
				pathLength={1}
				strokeDasharray={1}
				strokeDashoffset={1 - arc}
			/>
			<path
				d="M 304 166 L 196 166 L 264 222 C 204 222 168 254 168 292 C 168 336 206 360 256 360 C 292 360 318 348 338 332"
				fill="none"
				stroke={PEARL}
				strokeWidth={38}
				strokeLinecap="round"
				strokeLinejoin="round"
				pathLength={1}
				strokeDasharray={1}
				strokeDashoffset={1 - h}
			/>
			<circle cx={352} cy={128} r={30 * dot} fill={CORAL} />
		</svg>
	);
};

// Scene-entry transitions: the new scene is revealed on top of the previous one
type TR = 'none' | 'circle' | 'wipeUp' | 'split' | 'zoom' | 'wipeLeft' | 'flash';
const Scene: React.FC<{tr: TR; children: React.ReactNode; dur?: number}> = ({tr, children, dur = 28}) => {
	const f = useCurrentFrame();
	const p = tween(f, 0, dur, 0, 1, WHIP);
	let style: React.CSSProperties = {};
	if (tr === 'circle') style = {clipPath: `circle(${p * 150}% at 50% 41%)`};
	if (tr === 'wipeUp') style = {clipPath: `inset(${(1 - p) * 100}% 0 0 0)`};
	if (tr === 'split') style = {clipPath: `inset(${(1 - p) * 50}% 0 ${(1 - p) * 50}% 0)`};
	if (tr === 'wipeLeft') style = {clipPath: `inset(0 0 0 ${(1 - p) * 100}%)`};
	if (tr === 'zoom') style = {opacity: Math.min(1, p * 2.2), transform: `scale(${1.7 - 0.7 * p})`};
	if (tr === 'flash') style = {opacity: Math.min(1, p * 3)};
	return (
		<AbsoluteFill style={style}>
			<Bg />
			{children}
			{tr !== 'none' && <Footnote />}
		</AbsoluteFill>
	);
};

// ───────────── scenes ─────────────

const S1: React.FC = () => {
	const f = useCurrentFrame();
	const up = tween(f, 96, 40, 0, 1, IN_OUT);
	const name = tween(f, 108, 30);
	const tag = tween(f, 150, 30);
	return (
		<>
			<Mark x={540} y={760 - up * 170} size={440 - up * 120} at={6} />
			<div
				style={{
					position: 'absolute',
					top: 860,
					width: '100%',
					textAlign: 'center',
					overflow: 'hidden',
					fontFamily: arabic,
					fontWeight: 700,
					fontSize: 190,
					color: PEARL,
					opacity: name,
					transform: `translateY(${(1 - name) * 60}px)`,
					direction: 'rtl',
				}}
			>
				حياتي
			</div>
			<div
				style={{
					position: 'absolute',
					top: 1115,
					width: '100%',
					textAlign: 'center',
					fontFamily: arabic,
					fontWeight: 700,
					fontSize: 44,
					letterSpacing: `${0.08 + (1 - name) * 0.4}em`,
					color: PEARL,
					opacity: name * 0.7,
				}}
			>
				HAYATI
			</div>
			<Words text="يومك كله بمكان واحد" at={150} y={1330} size={96} accentLast />
			<div
				style={{
					position: 'absolute',
					top: 1620,
					width: '100%',
					textAlign: 'center',
					fontFamily: arabic,
					fontSize: 34,
					color: PEARL,
					opacity: tag * 0.0 + tween(f, 200, 24) * 0.6,
					direction: 'rtl',
				}}
			>
				قيد التطوير · نسخة تجريبية
			</div>
			<Sfx at={S(0.3)} src="audio/swipe.wav" volume={0.22} />
			<Sfx at={S(1.2)} src="audio/pop.wav" volume={0.3} />
			<Sfx at={S(2.5)} src="audio/shimmer.wav" volume={0.18} />
		</>
	);
};

const S2: React.FC = () => {
	const f = useCurrentFrame();
	const e = tween(f, 4, 44);
	return (
		<>
			<Phone img="02_today_health.png" y={720} w={520} ry={(1 - e) * 55} rx={(1 - e) * -14} scale={0.8 + e * 0.2} opacity={e} />
			<Ring x={170} y={420} r={74} p={tween(f, 30, 60, 0, 0.72, IN_OUT)} color={CORAL} label="الماي" />
			<Ring x={910} y={560} r={74} p={tween(f, 44, 60, 0, 0.58, IN_OUT)} color="#6EC5C0" label="النوم" />
			<Ring x={170} y={880} r={74} p={tween(f, 58, 60, 0, 0.85, IN_OUT)} color={PEARL} label="العادات" />
			<Words text="الماي، النوم، وعاداتك اليومية" at={14} y={1420} size={84} />
			<Sfx at={S(0.2)} src="audio/whoosh.wav" volume={0.22} />
			<Sfx at={S(0.7)} src="audio/pop.wav" volume={0.22} />
			<Sfx at={S(1.0)} src="audio/pop.wav" volume={0.2} />
		</>
	);
};

const S3: React.FC = () => {
	const f = useCurrentFrame();
	const z = tween(f, 0, 70, 0, 1, IN_OUT);
	const sw = tween(f, 118, 34, 0, 1, IN_OUT); // phone swaps to categories view
	return (
		<>
			<Phone img="03_money.png" y={700 - z * 40} w={540} scale={0.86 + z * 0.1} opacity={1 - sw} />
			<Phone img="04_money_cats.png" y={700} w={540} scale={0.96} opacity={sw} ry={(1 - sw) * -30} />
			<Chip label="أكل" x={170} y={430} at={22} accent />
			<Chip label="مواصلات" x={915} y={520} at={34} rot={4} />
			<Chip label="تسوق" x={150} y={800} at={46} rot={-4} />
			<Chip label="فواتير" x={925} y={900} at={58} accent />
			{f < 112 ? (
				<Words text="مصاريفك تحت عينك" at={10} y={1420} size={90} out={104} />
			) : (
				<Words text="وين راحت فلوسك؟" at={114} y={1420} size={90} accentLast />
			)}
			<Sfx at={S(0.1)} src="audio/swipe.wav" volume={0.2} />
			<Sfx at={S(0.45)} src="audio/pop.wav" volume={0.2} />
			<Sfx at={S(1.0)} src="audio/pop.wav" volume={0.2} />
			<Sfx at={S(2.0)} src="audio/whoosh.wav" volume={0.2} />
		</>
	);
};

const S4: React.FC = () => {
	const f = useCurrentFrame();
	const card = tween(f, 4, 30);
	const ph = tween(f, 38, 40);
	return (
		<>
			<div
				style={{
					position: 'absolute',
					left: 90,
					right: 90,
					top: 250 - (1 - card) * 200 - ph * 40,
					opacity: card,
					padding: '34px 40px',
					borderRadius: 40,
					background: PEARL,
					color: SEA,
					fontFamily: arabic,
					fontWeight: 700,
					fontSize: 44,
					lineHeight: 1.5,
					direction: 'rtl',
					boxShadow: '0 30px 80px rgba(0,0,0,.45)',
				}}
			>
				<div style={{fontSize: 30, opacity: 0.6}}>رسالة البنك</div>
				تم خصم 4.800 د.ب لدى «كافيه» *
			</div>
			<Phone img="05_sms.png" y={1060 + (1 - ph) * 500} w={460} scale={0.96} opacity={ph} />
			<Chip label="المبلغ" x={170} y={880} at={72} accent size={40} />
			<Chip label="المحل" x={910} y={980} at={84} size={40} />
			<Words text="تلصق رسالة البنك" at={6} y={1560} size={88} />
			<Sfx at={S(0.1)} src="audio/thud.wav" volume={0.25} />
			<Sfx at={S(0.7)} src="audio/swipe.wav" volume={0.2} />
			<Sfx at={S(1.2)} src="audio/check.wav" volume={0.22} />
		</>
	);
};

const S5: React.FC = () => {
	const f = useCurrentFrame();
	const fill = tween(f, 16, 70, 0, 0.7, IN_OUT);
	return (
		<>
			<Phone img="06_goals.png" y={700} w={540} scale={1} />
			<div style={{position: 'absolute', left: 120, right: 120, top: 1340, height: 34, borderRadius: 999, background: `${PEARL}22`}}>
				<div style={{width: `${fill * 100}%`, height: '100%', borderRadius: 999, background: CORAL, float: 'right'}} />
			</div>
			<Words text="توفّر لأهدافك" at={6} y={1420} size={96} accentLast />
			<Sfx at={S(0.1)} src="audio/swipe.wav" volume={0.2} />
			<Sfx at={S(0.5)} src="audio/riser.wav" volume={0.15} />
			<Sfx at={S(1.5)} src="audio/check.wav" volume={0.2} />
		</>
	);
};

const S6: React.FC = () => {
	const f = useCurrentFrame();
	const pan = tween(f, 0, 150, 0, 1, IN_OUT);
	const cx = 540 + (pan - 0.5) * -560;
	return (
		<>
			<Phone img="08_workout.png" x={cx - 560} y={720} w={480} scale={0.8} opacity={0.55} />
			<Phone img="07_study.png" x={cx} y={720} w={540} scale={1} />
			<Phone img="01_today.png" x={cx + 560} y={720} w={480} scale={0.8} opacity={0.55} />
			<Words text="محاضراتك وصلاتك" at={8} y={1330} size={92} />
			<Sfx at={S(0.1)} src="audio/whoosh.wav" volume={0.24} />
			<Sfx at={S(0.8)} src="audio/tick.wav" volume={0.2} />
		</>
	);
};

const S7: React.FC = () => {
	const f = useCurrentFrame();
	const slam = tween(f, 0, 18, 0, 1, EXPO);
	const shake = f > 16 && f < 30 ? Math.sin(f * 3) * (30 - f) * 0.7 : 0;
	return (
		<>
			<Phone img="08_workout.png" y={700 + shake} w={540} scale={1.5 - slam * 0.5} rz={(1 - slam) * -4} />
			<Chip label="تمرين" x={160} y={470} at={30} accent />
			<Chip label="أوزان" x={925} y={930} at={42} rot={-3} />
			<Words text="تمرينك وأوزانك" at={8} y={1330} size={96} accentLast />
			<Sfx at={S(0.18)} src="audio/thud.wav" volume={0.32} />
			<Sfx at={S(0.5)} src="audio/pop.wav" volume={0.2} />
		</>
	);
};

const S8: React.FC = () => {
	const f = useCurrentFrame();
	const items = ['واجبات', 'اختبارات', 'مهام'];
	return (
		<>
			<Phone img="09_tasks.png" y={690} w={500} rx={tween(f, 0, 40, 18, 0)} scale={0.96} />
			{items.map((t, i) => {
				const at = 30 + i * 22;
				const p = pop(f, at, 13);
				const c = tween(f, at + 16, 14);
				return (
					<div
						key={t}
						style={{
							position: 'absolute',
							top: 1262 + i * 108,
							left: 200,
							right: 200,
							height: 92,
							borderRadius: 26,
							background: PEARL,
							transform: `scale(${p}) translateX(${(1 - p) * 120}px)`,
							opacity: p,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							padding: '0 36px',
							direction: 'rtl',
							fontFamily: arabic,
							fontWeight: 700,
							fontSize: 46,
							color: SEA,
						}}
					>
						<span style={{textDecoration: c > 0.6 ? 'line-through' : 'none', opacity: c > 0.6 ? 0.55 : 1}}>{t}</span>
						<svg width={56} height={56} viewBox="0 0 56 56">
							<circle cx={28} cy={28} r={24} fill={c > 0.1 ? CORAL : 'none'} stroke={CORAL} strokeWidth={5} />
							<path d="M16 29 L25 38 L41 19" fill="none" stroke="#2A0E07" strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - c} />
						</svg>
					</div>
				);
			})}
			<Words text="وواجباتك واختباراتك" at={6} y={1625} size={72} />
			<Sfx at={S(0.1)} src="audio/swipe.wav" volume={0.2} />
			<Sfx at={S(0.8)} src="audio/check.wav" volume={0.2} />
			<Sfx at={S(1.2)} src="audio/check.wav" volume={0.2} />
			<Sfx at={S(1.6)} src="audio/check.wav" volume={0.2} />
		</>
	);
};

const S9: React.FC = () => {
	const f = useCurrentFrame();
	const k = tween(f, 40, 30);
	const out = tween(f, 200, 36, 0, 1, IN_OUT);
	return (
		<AbsoluteFill style={{opacity: 1 - out * 0}}>
			<Mark x={540} y={640} size={380} at={4} />
			<div
				style={{
					position: 'absolute',
					top: 780,
					width: '100%',
					textAlign: 'center',
					fontFamily: arabic,
					fontWeight: 700,
					fontSize: 170,
					color: PEARL,
					direction: 'rtl',
					opacity: k,
					transform: `translateY(${(1 - k) * 50}px)`,
				}}
			>
				حياتي
			</div>
			<Words text="يومك كله بمكان واحد" at={60} y={1060} size={84} accentLast />
			<div
				style={{
					position: 'absolute',
					top: 1330,
					width: '100%',
					display: 'flex',
					justifyContent: 'center',
					opacity: tween(f, 110, 24),
				}}
			>
				<div
					style={{
						padding: '22px 52px',
						borderRadius: 999,
						background: CORAL,
						color: '#2A0E07',
						fontFamily: arabic,
						fontWeight: 700,
						fontSize: 48,
						direction: 'rtl',
					}}
				>
					قيد التطوير · نسخة تجريبية
				</div>
			</div>
			<Sfx at={S(0.1)} src="audio/whoosh.wav" volume={0.22} />
			<Sfx at={S(1.4)} src="audio/shimmer.wav" volume={0.18} />
		</AbsoluteFill>
	);
};

// ───────────── composition ─────────────

const SCENES: {start: number; tr: TR; C: React.FC}[] = [
	{start: 0, tr: 'none', C: S1},
	{start: 5.1, tr: 'circle', C: S2},
	{start: 8.3, tr: 'wipeUp', C: S3},
	{start: 12.7, tr: 'split', C: S4},
	{start: 15.4, tr: 'zoom', C: S5},
	{start: 17.5, tr: 'wipeLeft', C: S6},
	{start: 20.3, tr: 'flash', C: S7},
	{start: 22.7, tr: 'wipeUp', C: S8},
	{start: 26.0, tr: 'circle', C: S9},
];

export const Hayati: React.FC = () => {
	const f = useCurrentFrame();
	const musicVol = interpolate(f, [0, 30, HAYATI_TOTAL - 90, HAYATI_TOTAL], [0, 0.3, 0.3, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<AbsoluteFill style={{background: SEA}}>
			{SCENES.map(({start, tr, C}, i) => {
				const from = S(start);
				const end = i + 1 < SCENES.length ? S(SCENES[i + 1].start) + 30 : HAYATI_TOTAL;
				return (
					<Sequence key={i} from={from} durationInFrames={end - from} layout="absolute-fill">
						<Scene tr={tr}>
							<C />
						</Scene>
					</Sequence>
				);
			})}
			<Audio src={staticFile('audio/music.wav')} volume={musicVol} />
			<Audio src={staticFile('audio/vo.wav')} volume={1} />
		</AbsoluteFill>
	);
};
