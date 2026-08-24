import { getExamViolations } from "@/utils/exam-integrity-server";
import ExamIntegrityViewer from "@/components/admin/ExamIntegrityViewer";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminExamIntegrityPage() {
  const violations = await getExamViolations(500);

  return <ExamIntegrityViewer initialViolations={violations} />;
}
