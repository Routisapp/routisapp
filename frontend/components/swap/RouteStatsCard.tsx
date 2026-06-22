"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouteStats } from "@/hooks/useRouteStats";
import type { RouteStats } from "@/lib/supabase";
import { DEX_BY_ID } from "@/constants/dex-registry";

const ACCENT = "#C9693A";

const dexIcon  = (id: string) => DEX_BY_ID[id as keyof typeof DEX_BY_ID]?.logoUrl ?? "";
const dexAbbr  = (id: string) => DEX_BY_ID[id as keyof typeof DEX_BY_ID]?.abbr    ?? id.slice(0, 4);
const shortLbl = (name: string): string => {
  const c = name.replace(" V3", "");
  return c.length > 11 ? c.slice(0, 10) + "…" : c;
};

function Skel({ w, h }: { w: number | string; h: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: 6, flexShrink: 0,
      background: "var(--border)", animation: "rs-pulse 1.4s ease-in-out infinite" }} />
  );
}

function calculateNodePositions<T>(
  items: T[], cx: number, cy: number, radius: number,
): (T & { x: number; y: number; angleDeg: number })[] {
  const n = items.length;
  return items.map((item, i) => {
    const angleDeg = (360 / n) * i - 90;
    const rad = (angleDeg * Math.PI) / 180;
    return { ...item, x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad), angleDeg };
  });
}

function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [sz, setSz] = useState({ w: 0, h: 0 });
  const update = useCallback(() => {
    if (!ref.current) return;
    const { offsetWidth: w, offsetHeight: h } = ref.current;
    setSz(prev => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, [ref]);
  useEffect(() => {
    update();
    const ro = new ResizeObserver(update);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref, update]);
  return sz;
}

function Diagram({ stats, W, H }: { stats: RouteStats[]; W: number; H: number }) {
  const n = stats.length;
  if (n === 0) return null;
  const S  = Math.min(W, H);
  const CX = W / 2, CY = H / 2;
  const HUB_R = Math.round(S * 0.12);
  const NR    = Math.round(S * (n <= 4 ? 0.07 : n <= 6 ? 0.06 : 0.05));
  const maxOR = Math.min(CX, CY) - NR - Math.round(S * 0.13);
  const OR    = Math.min(maxOR, Math.round(S * (n <= 4 ? 0.30 : n <= 6 ? 0.28 : 0.25)));
  const SW    = Math.max(2, Math.round(S * 0.020));
  const PF    = Math.max(7, Math.round(S * 0.034));
  const NF    = Math.max(6, Math.round(S * 0.027));
  const AF    = Math.max(5, Math.round(S * 0.024));
  const LGP   = Math.max(3, Math.round(S * 0.022));

  const nodes = calculateNodePositions(stats, CX, CY, OR);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}
      style={{ display: "block", overflow: "visible" }}>
      <defs>
        <radialGradient id="rs-hg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.18" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.00" />
        </radialGradient>
        {nodes.map((nd, i) => (
          <linearGradient key={i} id={`rsg${i}`} gradientUnits="userSpaceOnUse"
            x1={CX} y1={CY} x2={nd.x} y2={nd.y}>
            <stop offset="0%"   stopColor={ACCENT} stopOpacity="0.00" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={i === 0 ? "0.80" : "0.44"} />
          </linearGradient>
        ))}
        <clipPath id="rs-hc"><circle cx={CX} cy={CY} r={HUB_R - 2} /></clipPath>
        {nodes.map((nd, i) => (
          <clipPath key={i} id={`rsc${i}`}><circle cx={nd.x} cy={nd.y} r={NR - 2} /></clipPath>
        ))}
      </defs>

      {/* Hub glow */}
      <circle cx={CX} cy={CY} r={HUB_R + Math.round(S * 0.09)} fill="url(#rs-hg)" />

      {/* Spokes */}
      {nodes.map((nd, i) => (
        <line key={`sp${i}`} x1={CX} y1={CY} x2={nd.x} y2={nd.y}
          stroke={`url(#rsg${i})`} strokeWidth={SW} strokeLinecap="round" />
      ))}

      {/* Hub ring + circle */}
      <circle cx={CX} cy={CY} r={HUB_R + Math.round(S * 0.016)}
        fill="none" stroke={ACCENT} strokeWidth="1" strokeOpacity="0.22" />
      <circle cx={CX} cy={CY} r={HUB_R}
        fill="var(--bg-card)" stroke={ACCENT} strokeWidth={Math.max(1, S * 0.006)} />
      {/* Hub logo */}
      <foreignObject x={CX-(HUB_R-3)} y={CY-(HUB_R-3)}
        width={(HUB_R-3)*2} height={(HUB_R-3)*2} clipPath="url(#rs-hc)">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Routis"
          style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }} />
      </foreignObject>

      {/* Satellite nodes */}
      {nodes.map((nd, i) => {
        const isTop  = i === 0;
        const dimmed = !nd.hasSwaps;
        const icon   = dexIcon(nd.id);
        const abbr   = dexAbbr(nd.id);
        const deg    = ((nd.angleDeg % 360) + 360) % 360;

        // Determine label placement quadrant based on angle.
        // Nodes closer to top/bottom get label stacked vertically (above/below).
        // Nodes closer to left/right get label placed horizontally (beside).
        // Use 45° quadrant boundaries.
        const isAbove = deg > 225 && deg <= 315; // top quadrant  (270° center)
        const isBelow = deg > 45  && deg <= 135; // bottom quadrant (90° center)
        const isRight = deg <= 45 || deg > 315;  // right quadrant  (0° center)
        const isLeft  = deg > 135 && deg <= 225; // left quadrant   (180° center)

        const anchor: string = (isAbove || isBelow) ? "middle" : isRight ? "start" : "end";

        // GAP: clear space between icon edge and nearest label edge
        const GAP     = Math.round(S * 0.032);
        const lineGap = Math.round(S * 0.014);
        const blockH  = PF + lineGap + NF;

        // lx: horizontal anchor point for the text
        // blockMidY: vertical center of the two-line label block
        let lx: number;
        let blockMidY: number;

        if (isAbove) {
          // Label sits above the icon — block bottom edge touches icon top edge + GAP
          lx        = nd.x;
          blockMidY = nd.y - NR - GAP - blockH / 2;
        } else if (isBelow) {
          // Label sits below the icon — block top edge touches icon bottom edge + GAP
          lx        = nd.x;
          blockMidY = nd.y + NR + GAP + blockH / 2;
        } else if (isRight) {
          // Label sits to the right — left edge of text touches icon right edge + GAP
          lx        = nd.x + NR + GAP;
          blockMidY = nd.y;
        } else {
          // isLeft — label sits to the left — right edge of text touches icon left edge + GAP
          lx        = nd.x - NR - GAP;
          blockMidY = nd.y;
        }

        // ly1: vertical center of percentage line (larger font PF — top line)
        // ly2: vertical center of name line (smaller font NF — bottom line)
        // blockMidY is the center of the entire two-line block (height = PF + lineGap + NF).
        // Top line center = blockTop + PF/2 = (blockMidY - blockH/2) + PF/2
        // Bottom line center = blockTop + PF + lineGap + NF/2
        const blockTop = blockMidY - blockH / 2;
        const ly1 = blockTop + PF / 2;
        const ly2 = blockTop + PF + lineGap + NF / 2;

        return (
          <g key={nd.id} opacity={dimmed ? 0.72 : 1}>
            {/* Outer glow ring */}
            {!dimmed && (
              <circle cx={nd.x} cy={nd.y} r={NR + Math.round(S * 0.016)}
                fill={ACCENT} fillOpacity="0.09" />
            )}
            {/* Icon circle — same ACCENT border for all nodes */}
            <circle cx={nd.x} cy={nd.y} r={NR} fill="var(--bg-card)"
              stroke={ACCENT}
              strokeWidth={Math.max(1.5, S * 0.006)} />
            {icon ? (
              <foreignObject x={nd.x-(NR-2)} y={nd.y-(NR-2)}
                width={(NR-2)*2} height={(NR-2)*2} clipPath={`url(#rsc${i})`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icon} alt={nd.name}
                  style={{ width:"100%", height:"100%", objectFit:"contain",
                    display:"block", borderRadius:"50%" }} />
              </foreignObject>
            ) : (
              <text x={nd.x} y={nd.y} textAnchor="middle" dominantBaseline="central"
                fontSize={AF} fontWeight="800" fill={ACCENT}>{abbr}</text>
            )}
            {/* Labels: two-line block centered on the label origin point */}
            <text x={lx} y={ly1} textAnchor={anchor} dominantBaseline="middle"
              fontSize={PF} fontWeight="800"
              fill="var(--text-primary)">
              {`%${nd.percentage.toFixed(1)}`}
            </text>
            <text x={lx} y={ly2} textAnchor={anchor} dominantBaseline="middle"
              fontSize={NF} fontWeight="400" fill="var(--text-secondary)">
              {shortLbl(nd.name)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface RouteStatsCardProps { fixedHeight?: number; }

export function RouteStatsCard({ fixedHeight }: RouteStatsCardProps = {}) {
  const { stats, total, loading, error, refresh } = useRouteStats();

  // Single ref on the CARD itself — always mounted
  const cardRef = useRef<HTMLDivElement>(null);
  const { w: cardW, h: cardH } = useSize(cardRef);

  // Header ref to measure it
  const hdrRef = useRef<HTMLDivElement>(null);
  const { h: hdrH } = useSize(hdrRef);

  const PAD   = 32;
  const totalH = fixedHeight ?? cardH;
  const diagH  = Math.max(60, totalH - (hdrH || 72) - PAD);
  const diagW  = Math.max(60, cardW - 28);

  return (
    <div ref={cardRef}
      className="w-full rounded-2xl border border-[--border] bg-[--bg-card] shadow-2xl flex flex-col overflow-hidden"
      style={{ padding: "16px 14px 16px",
               height: fixedHeight ? `${fixedHeight}px` : "auto" }}>

      {/* Header */}
      <div ref={hdrRef} className="shrink-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-sm font-black text-[--text-primary] leading-tight m-0">
              Routis always finds the best route.
            </h2>
          </div>
          <button onClick={refresh} title="Yenile" disabled={loading}
            className="flex items-center justify-center w-7 h-7 rounded-lg border border-[--border] bg-[--bg-input] text-[--text-secondary] hover:text-[--text-primary] hover:border-[--accent-orange] transition-all disabled:opacity-40 shrink-0 ml-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: loading ? "rs-spin 1s linear infinite" : "none" }}>
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
        <div className="h-px bg-[--border] my-2" />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-4 flex-1">
          <div style={{ width:90, height:90, borderRadius:"50%",
            background:"var(--border)", animation:"rs-pulse 1.4s ease-in-out infinite" }} />
          {[0,1,2].map(i => (
            <div key={i} className="flex items-center gap-2 w-full">
              <Skel w={20} h={20} />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skel w="52%" h={8} /><Skel w="34%" h={7} />
              </div>
              <Skel w={28} h={8} />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-6 px-3 flex-1 flex flex-col items-center justify-center">
          <div className="text-xl mb-2">⚠</div>
          <p className="text-[11px] text-[--text-secondary] mb-1">Veri yüklenemedi</p>
          <p className="text-[10px] text-[--text-secondary] opacity-60 mb-2 max-w-[200px] break-words">{error}</p>
          <button onClick={refresh}
            className="mt-2 px-3 py-1 rounded-lg text-[11px] font-bold text-white border-none cursor-pointer"
            style={{ background: ACCENT }}>Tekrar Dene</button>
        </div>
      )}

      {/* Diagram — always in flex-1 area, diagW/diagH driven by card size */}
      {!loading && !error && stats.length > 0 && (
        <>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            {/* Only render SVG once we have real dimensions */}
            {cardW > 10 && (
              <Diagram stats={stats} W={diagW} H={diagH} />
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes rs-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes rs-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
