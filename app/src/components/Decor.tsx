/**
 * Purely decorative, inline-SVG layers (no external images).
 * Both are aria-hidden, pointer-events:none and sit behind real content.
 */

/** Flowing mint waves along the bottom of the workspace, rising towards the bottom-right. */
export function WorkspaceWaves() {
  return (
    <svg className="decor decor-waves no-print" viewBox="0 0 1440 360" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="wv1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d9f1df" stopOpacity="0.35" />
          <stop offset="1" stopColor="#d9f1df" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="wv2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#bce6c8" stopOpacity="0.25" />
          <stop offset="1" stopColor="#bce6c8" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="wv3" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#91d3a9" stopOpacity="0.2" />
          <stop offset="1" stopColor="#91d3a9" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="wv4" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6dbb8d" stopOpacity="0.15" />
          <stop offset="1" stopColor="#6dbb8d" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <path fill="url(#wv1)" d="M0,175 C240,115 470,235 730,180 C990,125 1210,50 1440,100 L1440,360 L0,360 Z" />
      <path fill="url(#wv2)" d="M0,235 C230,185 490,285 770,228 C1030,178 1250,120 1440,165 L1440,360 L0,360 Z" />
      <path fill="url(#wv3)" d="M0,288 C270,248 510,322 790,278 C1050,238 1270,205 1440,232 L1440,360 L0,360 Z" />
      <path fill="url(#wv4)" d="M0,332 C310,302 570,352 850,322 C1090,296 1290,282 1440,298 L1440,360 L0,360 Z" />
    </svg>
  );
}

/** Darker-green flowing waves at the foot of the sidebar. */
export function SidebarWaves() {
  return (
    <svg className="decor decor-side no-print" viewBox="0 0 264 240" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path fill="#0a6148" fillOpacity="0.35" d="M0,70 C60,40 110,100 170,75 C215,57 245,40 264,48 L264,240 L0,240 Z" />
      <path fill="#07513d" fillOpacity="0.6" d="M0,118 C70,88 120,150 185,122 C225,105 250,92 264,98 L264,240 L0,240 Z" />
      <path fill="#064536" fillOpacity="0.85" d="M0,168 C65,145 125,198 190,172 C228,157 250,148 264,152 L264,240 L0,240 Z" />
    </svg>
  );
}
