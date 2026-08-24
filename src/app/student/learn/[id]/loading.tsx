import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function LearnLoading() {
  return (
    <div className="max-w-7xl mx-auto py-12 flex flex-col items-center justify-center min-h-[500px]">
      <LoadingSpinner label="กำลังเตรียมห้องเรียนและเนื้อหาบทเรียน..." size="lg" />
    </div>
  );
}
