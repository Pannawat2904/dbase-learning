"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";

interface Course {
  id: string;
  title: string;
}

interface CourseSelectorProps {
  courses: Course[];
  activeCourseId: string;
}

export default function CourseSelector({ courses, activeCourseId }: CourseSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    
    if (courseId) {
      params.set("course", courseId);
    } else {
      params.delete("course");
    }
    router.push(`?${params.toString()}`);
    router.refresh();
  };

  return (
    <div className="relative flex items-center min-w-[200px]">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <BookOpen className="h-4 w-4 text-slate-400" />
      </div>
      <select
        value={activeCourseId}
        onChange={handleCourseChange}
        className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl leading-5 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-700 dark:text-slate-300 appearance-none cursor-pointer transition-colors"
      >
        {courses.map((course) => (
          <option key={course.id} value={course.id.toString()}>
            {course.title}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  );
}
