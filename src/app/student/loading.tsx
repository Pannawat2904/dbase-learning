import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function StudentLoading() {
  return (
    <div className="max-w-7xl mx-auto py-12 flex flex-col items-center justify-center min-h-[450px]">
      <LoadingSpinner label="กำลังโหลดบทเรียนและข้อมูลผู้เรียน..." size="lg" />
    </div>
  );
}
