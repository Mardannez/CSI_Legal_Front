'use client';

import { useEffect, useRef, useState } from 'react';

interface PdfCanvasViewerProps {
  url: string;
  title: string;
}

export default function PdfCanvasViewer({ url, title }: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let currentPdf: any = null;

    const clearContainer = () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };

    const renderPdf = async () => {
      const container = containerRef.current;
      if (!container) return;

      setLoading(true);
      setError(null);
      clearContainer();

      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();

        const loadingTask = pdfjs.getDocument({
          url,
          disableAutoFetch: true,
        });
        const pdf = await loadingTask.promise;
        currentPdf = pdf;

        const availableWidth = Math.max(container.clientWidth - 32, 320);
        const targetWidth = Math.min(availableWidth, 980);
        const pixelRatio = window.devicePixelRatio || 1;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = targetWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });

          const pageShell = document.createElement('div');
          pageShell.className =
            'mx-auto mb-5 flex justify-center bg-white shadow-elevation-2';
          pageShell.setAttribute('aria-label', `${title} - página ${pageNumber}`);

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.style.maxWidth = '100%';
          canvas.style.userSelect = 'none';

          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

          pageShell.appendChild(canvas);
          container.appendChild(pageShell);

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
          }).promise;
        }

        if (!cancelled) setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'No se pudo cargar el PDF');
          setLoading(false);
        }
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
      clearContainer();
      if (currentPdf?.destroy) currentPdf.destroy();
    };
  }, [url, title]);

  return (
    <div
      className="relative h-full w-full bg-neutral-800 select-none"
      onContextMenu={(event) => event.preventDefault()}
      onCopy={(event) => event.preventDefault()}
      onCut={(event) => event.preventDefault()}
      onPaste={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-800 text-sm text-white">
          Cargando PDF...
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-800 px-6 text-center text-sm text-white">
          {error}
        </div>
      )}

      <div
        ref={containerRef}
        className="h-full w-full overflow-auto px-4 py-5"
        aria-label={title}
      />
    </div>
  );
}
