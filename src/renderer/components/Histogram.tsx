import React, { useRef, useEffect } from 'react';
import { Theme, SPACING, RADIUS, TYPO } from '../styles/theme';

interface HistogramProps {
  imageUrl: string;
  theme: Theme;
  width?: number;
  height?: number;
}

export const Histogram: React.FC<HistogramProps> = ({ imageUrl, theme: t, width = 200, height = 80 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Draw image to offscreen canvas to get pixel data
      const offscreen = document.createElement('canvas');
      const octx = offscreen.getContext('2d');
      if (!octx) return;
      const sampleW = Math.min(img.width, 256);
      const sampleH = Math.min(img.height, 256);
      offscreen.width = sampleW;
      offscreen.height = sampleH;
      octx.drawImage(img, 0, 0, sampleW, sampleH);
      const imageData = octx.getImageData(0, 0, sampleW, sampleH);
      const data = imageData.data;

      // Calculate histogram for R, G, B, Luminance
      const bins = 256;
      const rHist = new Uint32Array(bins);
      const gHist = new Uint32Array(bins);
      const bHist = new Uint32Array(bins);
      const lHist = new Uint32Array(bins);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        rHist[r]++;
        gHist[g]++;
        bHist[b]++;
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        lHist[Math.min(255, lum)]++;
      }

      // Find max for normalization
      const maxVal = Math.max(
        ...Array.from(lHist).slice(1, 255) // exclude pure black/white
      );

      // Draw histogram
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = t.bgTertiary;
      ctx.fillRect(0, 0, width, height);

      // Draw luminance histogram (main)
      const barW = width / bins;
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < bins; i++) {
        const h = (lHist[i] / maxVal) * height * 0.9;
        ctx.fillStyle = t.textSecondary;
        ctx.fillRect(i * barW, height - h, barW + 0.5, h);
      }

      // Draw RGB channels with transparency
      ctx.globalAlpha = 0.3;
      const channels = [
        { hist: rHist, color: t.colorLabelRed },
        { hist: gHist, color: t.colorLabelGreen },
        { hist: bHist, color: t.colorLabelBlue },
      ];
      for (const ch of channels) {
        ctx.fillStyle = ch.color;
        for (let i = 0; i < bins; i++) {
          const h = (ch.hist[i] / maxVal) * height * 0.9;
          ctx.fillRect(i * barW, height - h, barW + 0.5, h);
        }
      }

      ctx.globalAlpha = 1.0;
    };
    img.src = imageUrl;
    imgRef.current = img;
  }, [imageUrl, width, height, t]);

  return (
    <div style={{ borderRadius: RADIUS.sm, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width, height }} />
    </div>
  );
};
