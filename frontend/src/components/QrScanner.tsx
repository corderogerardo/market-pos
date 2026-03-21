import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

interface Props {
  onDetected: (code: string) => void;
}

export default function QrScanner({ onDetected }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const scannerId = "qr-reader-" + Date.now();
    const container = document.getElementById("qr-reader-container");
    if (!container) return;

    // Create a fresh div for each mount (html5-qrcode modifies the DOM)
    const scannerDiv = document.createElement("div");
    scannerDiv.id = scannerId;
    container.innerHTML = "";
    container.appendChild(scannerDiv);

    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;
    let mounted = true;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (!mounted) return;
          onDetected(decodedText);
        },
        () => {}
      )
      .catch((err: Error) => {
        if (mounted) {
          setError(
            err.message?.includes("Permission")
              ? "Permiso de cámara denegado"
              : "No se pudo iniciar la cámara. Puede usar un lector USB."
          );
        }
      });

    return () => {
      mounted = false;
      try {
        const state = scanner.getState();
        if (
          state === Html5QrcodeScannerState.SCANNING ||
          state === Html5QrcodeScannerState.PAUSED
        ) {
          scanner.stop().catch(() => {});
        }
      } catch {
        // Scanner was never started, nothing to stop
      }
      scannerRef.current = null;
    };
  }, [onDetected]);

  return (
    <div className="mb-4 border rounded-lg overflow-hidden bg-black">
      <div id="qr-reader-container" className="w-full" style={{ maxHeight: 300 }} />
      {error ? (
        <p className="text-center text-xs text-red-400 py-2">{error}</p>
      ) : (
        <p className="text-center text-xs text-gray-400 py-1">
          Apunta la cámara al código QR del producto
        </p>
      )}
    </div>
  );
}
