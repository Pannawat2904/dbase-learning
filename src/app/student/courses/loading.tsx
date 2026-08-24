import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function CoursesLoading() {
  return (
    <div className="max-w-7xl mx-auto py-12 flex flex-col items-center justify-center min-h-[450px]">
      <LoadingSpinner label="กำลังโหลดรายวิชาและหน่วยการเรียนรู้..." size="lg" />
    </div>
  );
}
