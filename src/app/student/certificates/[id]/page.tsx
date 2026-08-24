import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { format } from "date-fns";
import { th } from "date-fns/locale";
import Link from 'next/link';
import { ChevronLeft, Award } from 'lucide-react';
import CertificateActions from '@/components/student/CertificateActions';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = await params;
  const supabase = await createClient();
  const { data: cert } = await supabase
    .from('certificates')
    .select('*, course:courses(title), module:modules(title)')
    .eq('id', unwrappedParams.id)
    .single();

  if (!cert) return { title: 'เกียรติบัตร | AI LMS' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', cert.student_id)
    .single();

  const studentName = profile?.full_name || "นักเรียน";
  const courseOrModuleName = cert.module_id ? (cert.module?.title || "ไม่ระบุหน่วย") : (cert.course?.title || "ไม่ระบุรายวิชา");

  return {
    title: `เกียรติบัตร_${studentName}_${courseOrModuleName}`,
  };
}

export default async function CertificateViewPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = await params;
  const supabase = await createClient();
  
  // Get cert data
  const { data: cert, error } = await supabase
    .from('certificates')
    .select(`
      *,
      course:courses (
        title,
        instructor
      ),
      module:modules (
        title,
        course:courses (
          title,
          instructor
        )
      )
    `)
    .eq('id', unwrappedParams.id)
    .single();

  if (error || !cert) {
    notFound();
  }

  // Fetch student profile manually since FK might be missing
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', cert.student_id)
    .single();

  const { data: settings } = await supabase
    .from('settings')
    .select('admin_name')
    .single();

  // Fallback for names if not complete in DB
  const studentName = profile?.full_name || "นักเรียน";
  const isModule = !!cert.module_id;
  const courseOrModuleName = isModule ? (cert.module?.title || "ไม่ระบุหน่วย") : (cert.course?.title || "ไม่ระบุรายวิชา");
  const instructor = cert.course?.instructor || cert.module?.course?.instructor || settings?.admin_name || "ครูปาณวัฐ";
  const completedText = isModule ? "ได้ผ่านการทดสอบและเรียนจบในหน่วย" : "ได้ผ่านการทดสอบและเรียนจบในรายวิชา";
  const issueDate = format(new Date(cert.issued_at), 'd MMMM yyyy', { locale: th });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Bulletproof 1-Page A4 Landscape Print Styling */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { 
            size: A4 landscape; 
            margin: 0 !important; 
          }
          html, body { 
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: hidden !important;
          }
          .print-wrapper {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
          }
          .certificate-card {
            width: 285mm !important;
            height: 198mm !important;
            max-width: 285mm !important;
            max-height: 198mm !important;
            margin: auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
        }
      `}} />

      <div className="flex items-center justify-between print:hidden">
        <Link 
          href="/student/certificates" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" /> กลับไปหน้าเกียรติบัตรทั้งหมด
        </Link>
        <CertificateActions />
      </div>

      <div className="print-wrapper w-full bg-slate-200 dark:bg-slate-900 rounded-3xl p-4 md:p-8 flex items-center md:justify-center overflow-x-auto">
        
        {/* Certificate Card */}
        <div id="certificate-to-download" className="certificate-card relative shrink-0 min-w-[800px] max-w-[920px] bg-white text-slate-800 shadow-2xl p-4 md:p-6 rounded-xl overflow-hidden">
          
          {/* Outer Royal Blue Border with Gold Inner Line */}
          <div className="w-full border-[10px] border-blue-900 rounded-lg p-2 bg-gradient-to-b from-blue-700 via-blue-800 to-blue-900 shadow-md">
            
            {/* Inner Border Container */}
            <div className="w-full border-2 border-amber-400 rounded bg-[#FAF9F5] p-6 md:p-10 flex flex-col justify-between relative overflow-hidden min-h-[520px]">
              
              {/* Gold Corner Ornaments */}
              <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-amber-400"></div>
              <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-amber-400"></div>
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-amber-400"></div>
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-amber-400"></div>

              {/* Watermark Logo */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none z-0">
                <div className="w-[350px] h-[350px] border-[18px] border-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-[100px] font-serif text-blue-900 leading-none">AI LMS</span>
                </div>
              </div>

              {/* Header Content */}
              <div className="text-center z-10 space-y-3">
                <div className="pt-2">
                  <h1 className="text-4xl md:text-5xl font-serif font-black text-blue-900 tracking-tight" style={{ textShadow: '1px 1px 0px rgba(245, 158, 11, 0.4)' }}>
                    ใบประกาศนียบัตร
                  </h1>
                  <p className="text-base md:text-lg text-slate-600 font-serif italic mt-2">ขอมอบไว้เพื่อแสดงว่า</p>
                </div>
                
                {/* Student Name */}
                <div className="py-2">
                  <div className="inline-block relative px-8 py-1">
                    <p className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-wide uppercase">{studentName}</p>
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-2"></div>
                  </div>
                </div>
                
                <p className="text-slate-600 text-sm md:text-base">{completedText}</p>
                <p className="text-xl md:text-2xl font-bold text-blue-950 max-w-xl mx-auto px-4 leading-relaxed">{courseOrModuleName}</p>
                
                <p className="text-xs md:text-sm text-slate-500 font-medium tracking-wide pt-2">ให้ไว้ ณ วันที่ {issueDate}</p>
              </div>
              
              {/* Footer with Signatures and Badge */}
              <div className="flex justify-between items-end w-full mt-8 z-10 px-4 md:px-10">
                
                {/* Left Signature */}
                <div className="text-center w-40 md:w-48">
                  <div className="border-b-2 border-blue-900 pb-1 mb-1">
                    <p className="font-serif italic text-2xl md:text-3xl text-slate-800 font-bold tracking-wide">ปาณวัฐ</p>
                  </div>
                  <p className="text-xs md:text-sm text-blue-900 font-semibold uppercase tracking-wider">ครูผู้สอน</p>
                </div>
                
                {/* Premium Gold Seal with Blue Ribbons */}
                <div className="relative w-28 h-28 md:w-32 md:h-32 flex items-center justify-center shrink-0 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 p-1 shadow-xl border-2 border-blue-900">
                  <div className="w-full h-full rounded-full border-2 border-dashed border-blue-900/40 flex items-center justify-center bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-400 shadow-inner p-1">
                    <div className="w-full h-full rounded-full border border-blue-900/60 flex flex-col items-center justify-center text-center p-1 bg-gradient-to-b from-transparent to-amber-500/20">
                      <span className="text-blue-950 font-black text-[9px] md:text-[10px] uppercase leading-tight tracking-wider mb-0.5">
                        Official
                      </span>
                      <Award className="w-6 h-6 md:w-7 md:h-7 text-blue-900 drop-shadow mb-0.5" />
                      <span className="text-blue-950 font-bold text-[7px] md:text-[8px] uppercase leading-none tracking-wider">
                        Certified
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Signature */}
                <div className="text-center w-40 md:w-48">
                  <div className="border-b-2 border-blue-900 pb-1 mb-1">
                    <p className="font-serif italic text-2xl md:text-3xl text-slate-800 font-bold tracking-wide">เมธาสิทธิ์</p>
                  </div>
                  <p className="text-xs md:text-sm text-blue-900 font-semibold uppercase tracking-wider">ครูประจำวิชา</p>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
