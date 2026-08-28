'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function toggleHiddenStudent(studentId: string, currentlyHidden: boolean) {
  const cookieStore = await cookies();
  const hiddenStudentsCookie = cookieStore.get('hidden_students')?.value;
  let hiddenStudents: string[] = [];
  
  if (hiddenStudentsCookie) {
    try {
      hiddenStudents = JSON.parse(hiddenStudentsCookie);
    } catch (e) {
      hiddenStudents = [];
    }
  }

  if (currentlyHidden) {
    // Unhide
    hiddenStudents = hiddenStudents.filter(id => id !== studentId);
  } else {
    // Hide
    if (!hiddenStudents.includes(studentId)) {
      hiddenStudents.push(studentId);
    }
  }

  // Set cookie valid for 10 years
  cookieStore.set('hidden_students', JSON.stringify(hiddenStudents), {
    path: '/',
    maxAge: 60 * 60 * 24 * 365 * 10, 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  revalidatePath('/admin/students');
}
