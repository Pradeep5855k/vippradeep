import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Zap, Keyboard, CheckCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Start detecting using standard BarcodeDetector if available
      initBarcodeDetector();
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setHasCamera(false);
      setCameraError(err.message || 'Could not access camera. Please enter barcode manually.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const initBarcodeDetector = () => {
    if ('BarcodeDetector' in window) {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
      });

      const detectInterval = setInterval(async () => {
        if (!videoRef.current || !isOpen || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            if (raw) {
              clearInterval(detectInterval);
              handleScanned(raw);
            }
          }
        } catch (e) {
          // ignore transient frame decode errors
        }
      }, 300);

      return () => clearInterval(detectInterval);
    }
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Audio not permitted without interaction
    }
  };

  const handleScanned = (barcode: string) => {
    playBeep();
    stopCamera();
    onScan(barcode);
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleScanned(manualInput.trim());
      setManualInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-base">Scan Barcode / QR</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative bg-slate-950 aspect-[4/3] flex items-center justify-center overflow-hidden">
          {hasCamera ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scan targeting box */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-36 border-2 border-dashed border-emerald-400 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500/80 animate-pulse" />
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-slate-300">
              <Camera className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-medium mb-1">Live Camera Unavailable</p>
              <p className="text-xs text-slate-400 mb-4">{cameraError}</p>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
          {/* Quick simulator buttons for testing */}
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Quick Barcode Test Samples:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleScanned('8901030383748')}
                className="text-left px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <span className="font-semibold block truncate">8901030383748</span>
                <span className="text-[10px] text-slate-500 truncate block">Aashirvaad Atta 5kg</span>
              </button>
              <button
                type="button"
                onClick={() => handleScanned('8901030383755')}
                className="text-left px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <span className="font-semibold block truncate">8901030383755</span>
                <span className="text-[10px] text-slate-500 truncate block">Fortune Oil 1L</span>
              </button>
              <button
                type="button"
                onClick={() => handleScanned('8901030111223')}
                className="text-left px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <span className="font-semibold block truncate">8901030111223</span>
                <span className="text-[10px] text-slate-500 truncate block">Tata Salt 1kg</span>
              </button>
              <button
                type="button"
                onClick={() => handleScanned('8901063142211')}
                className="text-left px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <span className="font-semibold block truncate">8901063142211</span>
                <span className="text-[10px] text-slate-500 truncate block">Maggi Noodles 70g</span>
              </button>
            </div>
          </div>

          {/* Manual Keyboard Input */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Type barcode or item code..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono-numbers"
              />
            </div>
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
