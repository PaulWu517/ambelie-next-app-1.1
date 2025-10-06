"use client";
import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

type Props = {
  open: boolean;
  targetUrl: string;
  onClose: () => void;
};

export default function QRCodeModal({ open, targetUrl, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    async function gen() {
      try {
        const url = await QRCode.toDataURL(targetUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        if (mounted) setDataUrl(url);
      } catch (e) {
        // noop
      }
    }
    if (open && targetUrl) gen();
    return () => {
      mounted = false;
    };
  }, [open, targetUrl]);

  if (!open) return null;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <button onClick={onClose} style={closeBtnStyle} aria-label="Close">
          ✕
        </button>
        <h3 style={titleStyle}>SCAN QR-CODE</h3>
        <p style={subtitleStyle}>
          Scan with your phone’s camera to preview this product in your space.
        </p>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          {dataUrl ? (
            <img src={dataUrl} alt="QR Code" style={{ width: 256, height: 256 }} />
          ) : (
            <div>Generating QR...</div>
          )}
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 8,
  width: 420,
  padding: 24,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  position: "relative",
};

const closeBtnStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  fontSize: 18,
  cursor: "pointer",
  position: "absolute",
  top: 12,
  right: 12,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  textAlign: "center",
  fontSize: 24,
  letterSpacing: 1,
  fontWeight: 600,
};

const subtitleStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#666",
  marginTop: 8,
};