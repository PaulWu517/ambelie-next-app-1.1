"use client";

import React, { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (mode: "outfit" | "headshot") => void;
  productName?: string;
  previewFashionUrl?: string | null;
  previewModelUrl?: string | null;
};

export default function AITryOnChoiceModal({ open, onClose, onSelect, productName, previewFashionUrl, previewModelUrl }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!open || !mounted) return null;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={closeBtnStyle} aria-label="Close">✕</button>
        <h3 style={titleStyle}>AI VIRTUAL TRY-ON</h3>
        <p style={subtitleStyle}>
          Choose a try-on mode for "{productName || 'this product'}":
        </p>
        <div style={cardsWrapStyle}>
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>Upload Full-Body Photo (Outfit Try-On)</div>
            <p style={cardDescStyle}>Upload your full-body photo. The system will use the product outfit image to perform garment replacement and generate the try-on result.</p>
            <button style={primaryBtnStyle} onClick={() => onSelect("outfit")}>Choose this mode</button>
          </div>

          <div style={cardStyle}>
            <div style={cardHeaderStyle}>Upload Headshot (Model Photo)</div>
            <p style={cardDescStyle}>Upload a clear headshot. The system will blend your face into the product's model image to generate a professional photo.</p>
            <button style={primaryBtnStyle} onClick={() => onSelect("headshot")}>Choose this mode</button>
          </div>
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
  padding: 24,
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  width: 860,
  maxWidth: "95vw",
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
  marginBottom: 18,
};

const cardsWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 16,
  background: "#fafafa",
};

const cardHeaderStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 8,
};

const cardDescStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#555",
  marginBottom: 10,
};

const previewImageStyle: React.CSSProperties = {
  width: "100%",
  height: 180,
  objectFit: "cover",
  borderRadius: 8,
  border: "1px solid #eee",
  marginBottom: 12,
};

const previewPlaceholderStyle: React.CSSProperties = {
  width: "100%",
  height: 180,
  borderRadius: 8,
  background: "#f0f0f0",
  border: "1px solid #eee",
  marginBottom: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#999",
  fontSize: 14,
};

const primaryBtnStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px 16px",
  borderRadius: 8,
  border: "none",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
  backgroundColor: "#111827",
  color: "#fff",
};