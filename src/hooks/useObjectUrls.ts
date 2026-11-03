"use client";

import { useEffect, useRef } from "react";

/** URL locale (blob:) déjà créée pour chaque fichier affiché en aperçu. */
const previewUrls = new WeakMap<Blob, string>();

const previewUrlOf = (file: Blob): string => {
  let url = previewUrls.get(file);
  if (!url) {
    url = URL.createObjectURL(file);
    previewUrls.set(file, url);
  }
  return url;
};

const revokePreviewUrl = (file: Blob): void => {
  const url = previewUrls.get(file);
  if (url) {
    URL.revokeObjectURL(url);
    previewUrls.delete(file);
  }
};

/**
 * URL d'aperçu des fichiers choisis par l'utilisateur. Une seule URL est créée par fichier (et non
 * une à chaque rendu) ; elle est libérée quand le fichier est retiré de la liste ou quand le
 * composant est démonté.
 */
export function useObjectUrls(files: readonly Blob[]): string[] {
  const shownRef = useRef<readonly Blob[]>([]);

  useEffect(() => {
    for (const file of shownRef.current) {
      if (!files.includes(file)) revokePreviewUrl(file);
    }
    shownRef.current = files;
  }, [files]);

  useEffect(
    () => () => {
      shownRef.current.forEach(revokePreviewUrl);
      shownRef.current = [];
    },
    []
  );

  return files.map(previewUrlOf);
}
