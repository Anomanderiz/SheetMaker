"use client";

export function PdfDownloadButton({
  className,
  label = "Download PDF",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.print()}
    >
      {label}
    </button>
  );
}
