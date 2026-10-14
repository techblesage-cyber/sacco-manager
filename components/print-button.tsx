"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" className="btn btn-secondary no-print" onClick={() => window.print()}>
      <Printer size={16} /> Print
    </button>
  );
}
