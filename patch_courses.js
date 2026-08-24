const fs = require('fs');

const path = 'src/app/student/courses/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add imports for Supabase client
if (!content.includes('import { createClient }')) {
  content = content.replace(
    'import { getCourses } from "@/utils/supabase/queries";',
    'import { getCourses } from "@/utils/supabase/queries";\nimport { createClient } from "@/utils/supabase/client";'
  );
}

// Add state for completed lessons
if (!content.includes('const [completedLessonIds, setCompletedLessonIds]')) {
  content = content.replace(
    'const [adminAvatar, setAdminAvatar] = useState<string | null>(null);',
    'const [adminAvatar, setAdminAvatar] = useState<string | null>(null);\n  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);'
  );
}

// Fetch user progress in useEffect
if (!content.includes('const supabase = createClient();')) {
  content = content.replace(
    'const data = await getCourses();',
    `const data = await getCourses();
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: progressData } = await supabase
          .from('student_lesson_progress')
          .select('lesson_id')
          .eq('student_id', user.id);
        
        if (progressData) {
          setCompletedLessonIds(progressData.map(p => String(p.lesson_id)));
        }
      }`
  );
}

// Add CheckCircle import
if (!content.includes('CheckCircle')) {
  content = content.replace(
    'import { Search, Filter, Clock, ChevronRight } from "lucide-react";',
    'import { Search, Filter, Clock, ChevronRight, CheckCircle } from "lucide-react";'
  );
}

// Modify rendering
const renderProgressRegex = /const progress = course\.progress \|\| 0;/;
if (content.match(renderProgressRegex)) {
  content = content.replace(
    renderProgressRegex,
    `// Calculate total lessons and completed lessons for this course
          let totalLessons = 0;
          let completedLessons = 0;
          
          if (course.modules && Array.isArray(course.modules)) {
            course.modules.forEach((mod: any) => {
              if (mod.lessons && Array.isArray(mod.lessons)) {
                totalLessons += mod.lessons.length;
                mod.lessons.forEach((lesson: any) => {
                  if (completedLessonIds.includes(String(lesson.id))) {
                    completedLessons++;
                  }
                });
              }
            });
          }
          
          let progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;`
  );
}

// Replace the UI
if (content.includes('เริ่มเรียน <ChevronRight')) {
  content = content.replace(
    /<span className="text-sm font-semibold text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">\s*เริ่มเรียน <ChevronRight className="w-4 h-4 ml-0\.5" \/>\s*<\/span>/,
    `{progress === 100 ? (
                      <span className="text-sm font-semibold text-emerald-600 flex items-center group-hover:translate-x-1 transition-transform">
                        เรียนจบแล้ว <CheckCircle className="w-4 h-4 ml-1" />
                      </span>
                    ) : progress > 0 ? (
                      <span className="text-sm font-semibold text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">
                        ทำต่อ ({progress}%) <ChevronRight className="w-4 h-4 ml-0.5" />
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">
                        เริ่มเรียน <ChevronRight className="w-4 h-4 ml-0.5" />
                      </span>
                    )}`
  );
}

fs.writeFileSync(path, content);
console.log('Modified courses page successfully');
