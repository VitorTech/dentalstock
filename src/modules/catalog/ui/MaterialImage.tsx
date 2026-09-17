"use client";

import { useState } from "react";

/** Gera um avatar estável baseado nas iniciais do material, usado quando
 * não há imagem cadastrada ou quando a imagem informada falha ao carregar. */
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
    // `<img>` de propósito: as imagens vêm de URLs arbitrárias cadastradas pela
    // clínica, e o otimizador `/_next/image` exigiria liberar domínios remotos
    // (e é a superfície das vulnerabilidades do Next 14 citadas na auditoria).
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
