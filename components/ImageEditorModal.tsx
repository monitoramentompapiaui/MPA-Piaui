import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, RefreshCw, Check, X, ZoomIn, Info } from 'lucide-react';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string; // original base64 or object URL
  onConfirm: (editedBase64: string) => void;
}

export default function ImageEditorModal({ isOpen, onClose, imageSrc, onConfirm }: ImageEditorModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);
  
  // Base display dimensions (scaled to fit within viewport)
  const [fitWidth, setFitWidth] = useState(0);
  const [fitHeight, setFitHeight] = useState(0);

  // Edit states (Zoom, Pan, Rotate)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  
  // Crop box percentage state (x, y, width, height) of the viewport container
  const [cropBox, setCropBox] = useState({ x: 15, y: 15, width: 70, height: 70 });

  // Dragging states
  const [isPanning, setIsPanning] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<'nw' | 'ne' | 'se' | 'sw' | null>(null);

  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [cropBoxStart, setCropBoxStart] = useState({ x: 15, y: 15, width: 70, height: 70 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [resizedBase64, setResizedBase64] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Pre-process the image when opened to optimize performance
  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    
    setIsProcessing(true);
    setImageLoaded(false);
    
    // Reset editing parameters
    setRotation(0);
    setZoom(1.2); // Start with a slight comfortable zoom
    setPan({ x: 0, y: 0 });
    setCropBox({ x: 15, y: 15, width: 70, height: 70 });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    
    img.onload = () => {
      setNaturalWidth(img.naturalWidth);
      setNaturalHeight(img.naturalHeight);
      
      // Downscale high-resolution images to max 1200px to ensure super-fluid dragging and canvas operations
      const MAX_DIM = 1200;
      if (img.naturalWidth > MAX_DIM || img.naturalHeight > MAX_DIM) {
        const canvas = document.createElement('canvas');
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        
        if (w > h) {
          if (w > MAX_DIM) {
            h = Math.round((h * MAX_DIM) / w);
            w = MAX_DIM;
          }
        } else {
          if (h > MAX_DIM) {
            w = Math.round((w * MAX_DIM) / h);
            h = MAX_DIM;
          }
        }
        
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setResizedBase64(canvas.toDataURL('image/jpeg', 0.9));
        } else {
          setResizedBase64(imageSrc);
        }
      } else {
        setResizedBase64(imageSrc);
      }
    };

    img.onerror = () => {
      console.error("Erro ao carregar imagem para o editor.");
      setResizedBase64(imageSrc);
      setImageLoaded(true);
      setIsProcessing(false);
    };
  }, [imageSrc, isOpen]);

  // Calculate standard fitted dimensions whenever the image is loaded or rotated
  useEffect(() => {
    if (!resizedBase64) return;

    const img = new Image();
    img.src = resizedBase64;
    img.onload = () => {
      const viewW = 480;
      const viewH = 320;

      // Swap dimensions if rotated 90 or 270 deg
      const isRotated = rotation === 90 || rotation === 270;
      const srcW = isRotated ? img.naturalHeight : img.naturalWidth;
      const srcH = isRotated ? img.naturalWidth : img.naturalHeight;

      const scaleToFit = Math.min(viewW / srcW, viewH / srcH) * 0.85;
      
      // Set baseline fitted display size
      setFitWidth(img.naturalWidth * scaleToFit);
      setFitHeight(img.naturalHeight * scaleToFit);

      setImageLoaded(true);
      setIsProcessing(false);
    };
  }, [resizedBase64, rotation]);

  // Drag & Resize Handlers
  const handleStartPan = (e: React.MouseEvent | React.TouchEvent) => {
    // Avoid panning if they click on a resize handle
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setIsPanning(true);
    setDragStart({ x: clientX, y: clientY });
    setPanStart({ x: pan.x, y: pan.y });
  };

  const handleStartResize = (e: React.MouseEvent | React.TouchEvent, handle: 'nw' | 'ne' | 'se' | 'sw') => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setIsResizing(true);
    setActiveHandle(handle);
    setDragStart({ x: clientX, y: clientY });
    setCropBoxStart({ ...cropBox });
  };

  const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
    if (!containerRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (isPanning) {
      const dx = clientX - dragStart.x;
      const dy = clientY - dragStart.y;
      setPan({
        x: panStart.x + dx,
        y: panStart.y + dy
      });
    } else if (isResizing && activeHandle) {
      const containerBounds = containerRef.current.getBoundingClientRect();
      const deltaX_pct = ((clientX - dragStart.x) / containerBounds.width) * 100;
      const deltaY_pct = ((clientY - dragStart.y) / containerBounds.height) * 100;

      const minSize = 10; // Minimum 10% width/height crop size
      let newBox = { ...cropBoxStart };

      if (activeHandle === 'se') {
        const potentialWidth = cropBoxStart.width + deltaX_pct;
        const potentialHeight = cropBoxStart.height + deltaY_pct;
        
        newBox.width = Math.max(minSize, Math.min(100 - cropBoxStart.x, potentialWidth));
        newBox.height = Math.max(minSize, Math.min(100 - cropBoxStart.y, potentialHeight));
      } 
      else if (activeHandle === 'nw') {
        const fixedRight = cropBoxStart.x + cropBoxStart.width;
        const fixedBottom = cropBoxStart.y + cropBoxStart.height;
        
        const potentialX = cropBoxStart.x + deltaX_pct;
        const potentialY = cropBoxStart.y + deltaY_pct;
        
        newBox.x = Math.max(0, Math.min(fixedRight - minSize, potentialX));
        newBox.y = Math.max(0, Math.min(fixedBottom - minSize, potentialY));
        newBox.width = fixedRight - newBox.x;
        newBox.height = fixedBottom - newBox.y;
      } 
      else if (activeHandle === 'ne') {
        const fixedLeft = cropBoxStart.x;
        const fixedBottom = cropBoxStart.y + cropBoxStart.height;
        
        const potentialWidth = cropBoxStart.width + deltaX_pct;
        const potentialY = cropBoxStart.y + deltaY_pct;
        
        newBox.y = Math.max(0, Math.min(fixedBottom - minSize, potentialY));
        newBox.width = Math.max(minSize, Math.min(100 - fixedLeft, potentialWidth));
        newBox.height = fixedBottom - newBox.y;
      } 
      else if (activeHandle === 'sw') {
        const fixedRight = cropBoxStart.x + cropBoxStart.width;
        const fixedTop = cropBoxStart.y;
        
        const potentialX = cropBoxStart.x + deltaX_pct;
        const potentialHeight = cropBoxStart.height + deltaY_pct;
        
        newBox.x = Math.max(0, Math.min(fixedRight - minSize, potentialX));
        newBox.width = fixedRight - newBox.x;
        newBox.height = Math.max(minSize, Math.min(100 - fixedTop, potentialHeight));
      }

      setCropBox(newBox);
    }
  };

  const handleGlobalEnd = () => {
    setIsPanning(false);
    setIsResizing(false);
    setActiveHandle(null);
  };

  // Attach global event listeners so drag/resize continues smoothly even if cursor leaves the box
  useEffect(() => {
    if (isPanning || isResizing) {
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalEnd);
      window.addEventListener('touchmove', handleGlobalMove, { passive: false });
      window.addEventListener('touchend', handleGlobalEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isPanning, isResizing, dragStart, panStart, cropBoxStart, activeHandle]);

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360 as any);
  };

  // Draw crop and transformations onto high-quality canvas and return output
  const handleConfirmEdit = () => {
    if (!containerRef.current || !imageRef.current) return;
    setIsProcessing(true);
    
    try {
      const img = imageRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx || !containerRef.current) {
        setIsProcessing(false);
        return;
      }

      const W_view = containerRef.current.clientWidth;
      const H_view = containerRef.current.clientHeight;

      // 1. Calculate base resolution mapping ratio
      const scale = img.naturalWidth / fitWidth;
      
      const left_px = (cropBox.x / 100) * W_view;
      const top_px = (cropBox.y / 100) * H_view;
      const width_px = (cropBox.width / 100) * W_view;
      const height_px = (cropBox.height / 100) * H_view;

      // Output resolution in high quality image space
      let finalW = width_px * scale;
      let finalH = height_px * scale;
      
      // Let's cap output to max 1200px dimension for performance and network efficiency
      const MAX_OUT = 1200;
      let drawRatio = 1;

      if (finalW > MAX_OUT || finalH > MAX_OUT) {
        if (finalW > finalH) {
          drawRatio = MAX_OUT / finalW;
        } else {
          drawRatio = MAX_OUT / finalH;
        }
        finalW = finalW * drawRatio;
        finalH = finalH * drawRatio;
      }

      canvas.width = Math.round(finalW);
      canvas.height = Math.round(finalH);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 2. Perform the exact inverse of screen positioning, scaling, and rotation on the high-quality canvas
      const offsetX = (W_view / 2 + pan.x) - (left_px + width_px / 2);
      const offsetY = (H_view / 2 + pan.y) - (top_px + height_px / 2);

      const canvasOffsetX = offsetX * scale * drawRatio;
      const canvasOffsetY = offsetY * scale * drawRatio;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.translate(canvasOffsetX, canvasOffsetY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom * scale * drawRatio, zoom * scale * drawRatio);

      // Draw original image centered
      ctx.drawImage(img, -fitWidth / 2, -fitHeight / 2, fitWidth, fitHeight);

      // 3. Export as high-quality JPEG
      const outputBase64 = canvas.toDataURL('image/jpeg', 0.88);
      onConfirm(outputBase64);
      setIsProcessing(false);
      onClose();
    } catch (err) {
      console.error("Falha ao renderizar imagem recortada:", err);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[95vh] border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crop"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight leading-tight">Editor de Foto da Espécie</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ajuste livremente o zoom, posição e corte</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-200/60 rounded-full transition-colors text-slate-450"
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col gap-5 items-center justify-center bg-slate-100">
          
          {isProcessing || !imageLoaded ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Preparando editor...</p>
            </div>
          ) : (
            <>
              {/* Interactive Viewport Canvas */}
              <div 
                ref={containerRef}
                className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center max-w-full select-none cursor-grab active:cursor-grabbing"
                style={{ 
                  width: '100%',
                  height: '350px',
                }}
                onMouseDown={handleStartPan}
                onTouchStart={handleStartPan}
              >
                {/* Transformed Image behind the mask */}
                <div 
                  className="absolute pointer-events-none"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                    transition: isPanning ? 'none' : 'transform 0.15s ease-out'
                  }}
                >
                  <img
                    ref={imageRef}
                    src={resizedBase64}
                    alt="Source preview"
                    className="object-contain animate-fade-in"
                    style={{
                      width: `${fitWidth}px`,
                      height: `${fitHeight}px`,
                    }}
                  />
                </div>
                
                {/* Dark Mask overlay + Hole Crop Window */}
                <div 
                  className="absolute border-2 border-dashed border-white ring-2 ring-blue-500/55 bg-transparent pointer-events-none shadow-2xl flex items-center justify-center"
                  style={{
                    left: `${cropBox.x}%`,
                    top: `${cropBox.y}%`,
                    width: `${cropBox.width}%`,
                    height: `${cropBox.height}%`,
                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.72)', // Giant shadows act as the dark mask
                  }}
                >
                  {/* Grid overlay for cropping guidelines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    <div className="border-r border-b border-white/40"></div>
                    <div className="border-r border-b border-white/40"></div>
                    <div className="border-b border-white/40"></div>
                    <div className="border-r border-b border-white/40"></div>
                    <div className="border-r border-b border-white/40"></div>
                    <div className="border-b border-white/40"></div>
                    <div className="border-r border-white/40"></div>
                    <div className="border-r border-white/40"></div>
                    <div></div>
                  </div>

                  {/* Corner resizing handles - pointer-events-auto makes them clickable even though parent is pointer-events-none */}
                  <div 
                    className="resize-handle absolute -top-3 -left-3 w-6 h-6 bg-white border-2 border-blue-600 rounded-full cursor-nw-resize pointer-events-auto active:scale-125 transition-transform shadow-lg z-10"
                    onMouseDown={(e) => handleStartResize(e, 'nw')}
                    onTouchStart={(e) => handleStartResize(e, 'nw')}
                  />
                  <div 
                    className="resize-handle absolute -top-3 -right-3 w-6 h-6 bg-white border-2 border-blue-600 rounded-full cursor-ne-resize pointer-events-auto active:scale-125 transition-transform shadow-lg z-10"
                    onMouseDown={(e) => handleStartResize(e, 'ne')}
                    onTouchStart={(e) => handleStartResize(e, 'ne')}
                  />
                  <div 
                    className="resize-handle absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-blue-600 rounded-full cursor-se-resize pointer-events-auto active:scale-125 transition-transform shadow-lg z-10"
                    onMouseDown={(e) => handleStartResize(e, 'se')}
                    onTouchStart={(e) => handleStartResize(e, 'se')}
                  />
                  <div 
                    className="resize-handle absolute -bottom-3 -left-3 w-6 h-6 bg-white border-2 border-blue-600 rounded-full cursor-sw-resize pointer-events-auto active:scale-125 transition-transform shadow-lg z-10"
                    onMouseDown={(e) => handleStartResize(e, 'sw')}
                    onTouchStart={(e) => handleStartResize(e, 'sw')}
                  />
                </div>
              </div>

              {/* Toolbar & Controls */}
              <div className="w-full space-y-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                
                {/* Sliders (Zoom Controls) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-550 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><ZoomIn size={14} className="text-blue-600" /> Zoom da Imagem</span>
                    <span className="text-blue-600 font-extrabold bg-blue-50 px-2 py-0.5 rounded-md text-[11px]">{zoom.toFixed(2)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="8" 
                    step="0.05" 
                    value={zoom} 
                    onChange={e => setZoom(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Single Rotation button and Help text */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 items-center">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Proporção livre</span>
                    <p className="text-xs text-slate-500 font-medium leading-normal">
                      Arraste os cantos azuis para alterar a forma de corte livremente sem restrições.
                    </p>
                  </div>

                  {/* Single Rotation button */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Orientação</span>
                    <button
                      type="button"
                      onClick={handleRotate}
                      className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <RotateCw size={15} className="text-blue-600" />
                      <span>Girar Foto (90°)</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 text-slate-450 text-[10px] font-semibold leading-relaxed self-start bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50 w-full">
                <Info size={12} className="text-blue-500 shrink-0" />
                <span>Instruções: Arraste a imagem para movê-la, arraste as bolinhas nos cantos para ajustar o corte livremente, e controle o zoom no controle deslizante.</span>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-550 hover:bg-slate-100 transition-colors"
            disabled={isProcessing}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmEdit}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/10 transition-colors"
            disabled={isProcessing || !imageLoaded}
          >
            <Check size={14} /> Aplicar e Salvar
          </button>
        </div>

      </div>
    </div>
  );
}
