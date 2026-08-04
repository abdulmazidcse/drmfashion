"use client";

export default function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        background: "#09090b",
        color: "#fff",
        border: "none",
        padding: "10px 24px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
        borderRadius: 4,
      }}
    >
      🖨️ Print Invoice
    </button>
  );
}
