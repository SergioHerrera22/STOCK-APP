import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export default function BarcodeScanner({ onScan, onClose, isOpen }) {
  const [mode, setMode] = useState("camera"); // "camera" | "manual"
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!isOpen || mode !== "camera") return;

    let animationId;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            scanQRCode();
          };
        }
      } catch (err) {
        setError("No se pudo acceder a la cámara. Cambia a modo manual.");
      }
    };

    const scanQRCode = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        onScan(code.data);
        stopCamera();
        return;
      }

      animationId = requestAnimationFrame(scanQRCode);
    };

    startCamera();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      stopCamera();
    };
  }, [isOpen, mode, onScan]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleManualSubmit = () => {
    const clean = manualInput.trim();
    if (!clean) {
      setError("Ingresa un código de barras.");
      return;
    }
    setError("");
    onScan(clean);
    setManualInput("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">
            Escanear código de barras
          </h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4 flex gap-2 rounded-lg border border-slate-700 bg-slate-950 p-1.5">
          <button
            onClick={() => {
              setMode("camera");
              setError("");
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === "camera"
                ? "bg-sky-500/20 text-sky-300"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📷 Cámara
          </button>
          <button
            onClick={() => {
              setMode("manual");
              stopCamera();
              setError("");
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === "manual"
                ? "bg-sky-500/20 text-sky-300"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ⌨️ Manual
          </button>
        </div>

        {mode === "camera" ? (
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-700 bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-48 border-2 border-dashed border-sky-400/50 rounded-lg" />
              </div>
            </div>
            <p className="text-center text-xs text-slate-500">
              Apunta la cámara al código de barras o QR
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleManualSubmit();
              }}
              placeholder="Pegá o escribí el código..."
              autoFocus
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
            />
            <button
              onClick={handleManualSubmit}
              className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50"
            >
              Confirmar código
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-rose-700/60 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}
