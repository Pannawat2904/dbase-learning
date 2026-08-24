const fs = require('fs');

const path = 'src/utils/supabase/queries.ts';
let content = fs.readFileSync(path, 'utf8');

// Add imports
if (!content.includes('verifyAdminCookie')) {
  content = content.replace(
    "import { createClient } from './server';",
    "import { createClient } from './server';\nimport { cookies } from 'next/headers';\nimport { verifyAdminCookie } from '../auth/admin';\n\nasync function requireAdmin() {\n  const cookieStore = await cookies();\n  const token = cookieStore.get('teacher_auth')?.value;\n  if (!(await verifyAdminCookie(token))) {\n    throw new Error('Unauthorized: Admin access required');\n  }\n}"
  );
}

const adminFunctions = [
  'createCourse', 'updateCourse', 'createModule', 'updateModule', 
  'createLesson', 'updateLesson', 'deleteLesson', 'updateModuleOrder', 
  'updateLessonOrder', 'createAdminUser', 'deleteAdminUser', 
  'updateSettings', 'updateEssayScore', 'gradeAssignment', 
  'issueCertificate', 'deleteExamScore', 'resetStudentAssignments', 
  'resetStudentProgress', 'deleteStudentProfile'
];

for (const fn of adminFunctions) {
  const regex = new RegExp(`(export async function ${fn}\\([^)]*\\)\\s*\\{)`);
  if (!content.includes(`await requireAdmin();`) || true) {
    content = content.replace(regex, `$1\n  await requireAdmin();`);
  }
}

fs.writeFileSync(path, content);
console.log('Done modifying queries.ts');
