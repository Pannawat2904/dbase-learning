"use client";

import { Printer, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

export default function CertificateActions({ studentName }: { studentName?: string }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    try {
      setIsDownloading(true);
      const element = document.getElementById('certificate-to-download');
      
      if (!element) {
        toast.error('ไม่พบเกียรติบัตร');
        return;
      }
      
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const safeName = (studentName || 'student').replace(/\s+/g, '_');
      link.download = `Certificate_${safeName}.png`;
      link.href = image;
      link.click();
      
      toast.success('ดาวน์โหลดเกียรติบัตรสำเร็จ');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 print:hidden">
      <button 
        onClick={handleDownloadImage}
        disabled={isDownloading}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm shadow-md shadow-amber-600/20 disabled:opacity-70"
      >
        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {isDownloading ? 'กำลังประมวลผล...' : 'บันทึกเป็นรูปภาพ (มือถือ)'}
      </button>
      <button 
        onClick={handlePrint}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-md shadow-blue-600/20"
      >
        <Printer className="w-4 h-4" /> พิมพ์ / PDF
      </button>
    </div>
  );
}
