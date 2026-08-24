"use client";

import { Printer } from "lucide-react";

export default function CertificateActions() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex items-center gap-3 print:hidden">
      <button 
        onClick={handlePrint}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-md shadow-blue-600/20"
      >
        <Printer className="w-4 h-4" /> ดาวน์โหลด / พิมพ์เกียรติบัตร
      </button>
    </div>
  );
}
