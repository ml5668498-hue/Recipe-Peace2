/**
 * Recetario de la Paz — custom brand logo
 *
 * Concept: a plate (two concentric thin circles in sage) framing a heart
 * whose left lobe is drawn in terracota and whose right lobe morphs into
 * a pointed leaf in sage green. The two sides share the centre-top and
 * centre-bottom anchor points, creating a yin-yang-like mark that reads
 * simultaneously as heart, leaf, and bowl/plate.
 */
export function RecetarioLogo({
  size = 64,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Recetario de la Paz"
    >
      {/* ── Plate: double concentric ring ────────────────────────── */}
      <circle cx="32" cy="32" r="29.5" stroke="#9BB89B" strokeWidth="1.4" />
      <circle cx="32" cy="32" r="25.5" stroke="#9BB89B" strokeWidth="0.6" opacity="0.45" />

      {/* ── Left lobe — heart curve (terracota) ──────────────────── */}
      {/*
        Anchors: top (32,18) → bottom (32,45)
        The left lobe curves out to ~x=12, peaking near y=24
      */}
      <path
        d="M 32 18
           C 30 14.5, 25 12, 20 13
           C 13.5 14.5, 11 20, 11 25
           C 11 33, 19 39.5, 32 47"
        stroke="#C4714A"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Right lobe — leaf curve (sage green) ─────────────────── */}
      {/*
        Same anchors: top (32,18) → bottom (32,47)
        Curves out to ~x=52, but with a sharper, more pointed silhouette
        to evoke a leaf rather than a round heart lobe
      */}
      <path
        d="M 32 18
           C 35 13, 43 12, 48 17
           C 53 22, 53 31, 48 37
           C 44 42, 38 45, 32 47"
        stroke="#9BB89B"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Leaf mid-vein (inside right lobe) ────────────────────── */}
      <path
        d="M 32 18 Q 46 27 32 47"
        stroke="#7A9E7A"
        strokeWidth="0.7"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* ── Tiny leaf at the heart's bottom tip ──────────────────── */}
      {/*
        Two petals opening outward from (32,47), giving the mark
        a small botanical "stem" feel
      */}
      <path
        d="M 32 47 Q 28 50 26 52.5 Q 30 51 32 47 Z"
        fill="#9BB89B"
        opacity="0.75"
      />
      <path
        d="M 32 47 Q 36 50 38 52.5 Q 34 51 32 47 Z"
        fill="#9BB89B"
        opacity="0.55"
      />

      {/* ── Subtle fill inside the heart (warm beige tint) ───────── */}
      {/*
        A very faint fill to give depth; drawn as a closed path
        combining both lobes
      */}
      <path
        d="M 32 18
           C 30 14.5, 25 12, 20 13
           C 13.5 14.5, 11 20, 11 25
           C 11 33, 19 39.5, 32 47
           C 38 45, 44 42, 48 37
           C 53 31, 53 22, 48 17
           C 43 12, 35 13, 32 18 Z"
        fill="#F5EFE7"
        opacity="0.35"
      />
    </svg>
  );
}
