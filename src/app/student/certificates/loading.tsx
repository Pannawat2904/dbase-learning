import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function CertificatesLoading() {
  return (
    <div className="max-w-7xl mx-auto py-12 flex flex-col items-center justify-center min-h-[450px]">
      <LoadingSpinner label="กำลังโหลดแฟ้มสะสมเกียรติบัตร..." size="lg" />
    </div>
  );
}
