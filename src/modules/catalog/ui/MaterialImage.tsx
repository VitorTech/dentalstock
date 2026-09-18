"use client";

import { useState } from "react";

/** Builds a stable avatar from the material's initials, used when no image is
 * registered or when the given image fails to load. */
export function fallbackImageSrc(name: string) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    name
  )}&backgroundType=gradientLinear&fontSize=38`;
}

export default function MaterialImage({
  material,
  size = 40,
  rounded = "rounded-xl",
  className = "",
}: {
  material: { name: string; imageUrl: string | null };
  size?: number;
  rounded?: string;
  className?: string;
}) {
  const initialSrc = material.imageUrl || fallbackImageSrc(material.name);
  const [src, setSrc] = useState(initialSrc);
  const [triedFallback, setTriedFallback] = useState(false);

  return (
    // A plain `<img>` on purpose: images come from arbitrary URLs entered by
    // the clinic, and the `/_next/image` optimizer would require allowlisting
    // remote domains (and is the surface of the Next 14 advisories).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={material.name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => {
        if (!triedFallback) {
          setTriedFallback(true);
          setSrc(fallbackImageSrc(material.name));
        }
      }}
      className={`shrink-0 ${rounded} border border-hairline bg-surfaceMuted object-cover p-1 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
