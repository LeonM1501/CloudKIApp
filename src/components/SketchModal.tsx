import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, Trash2, Check, PenTool } from 'lucide-react';

interface SketchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttachSketch: (name: string) => void;
}

export const SketchModal: React.FC<SketchModalProps> = ({
  isOpen,
  onClose,
  onAttachSketch,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [brushSize, setBrushSize] = useState(4);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#141414';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    setDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#1e1e1e] border border-[#333] shadow-2xl overflow-hidden">
        <div className="px-4 py-3 bg-[#161616] border-b border-[#2b2b2b] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <PenTool className="w-4 h-4 text-emerald-400" />
            <span>Skizze zeichnen (iPad Touch / Apple Pencil)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9a9a9a] hover:text-white hover:bg-[#2a2a2a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ffffff'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 ${
                    color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <button
                type="button"
                onClick={() => setColor('#141414')}
                className="px-2 py-1 rounded bg-[#2a2a2a] text-xs text-[#ccc] flex items-center gap-1"
              >
                <Eraser className="w-3.5 h-3.5" /> Radierer
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="range"
                min={2}
                max={16}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-24 accent-blue-500"
              />
              <button
                type="button"
                onClick={clearCanvas}
                className="p-1.5 rounded bg-[#2a2a2a] hover:bg-[#333] text-xs text-[#ccc]"
                title="Alles löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={540}
            height={320}
            onPointerDown={startDraw}
            onPointerMove={draw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
            className="w-full h-72 rounded-xl border border-[#333] bg-[#141414] touch-none cursor-crosshair"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#2a2a2a] text-xs text-white"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => {
                onAttachSketch(`iPad_Skizze_${new Date().toLocaleTimeString('de-DE')}.png`);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Skizze an Chat anhängen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
