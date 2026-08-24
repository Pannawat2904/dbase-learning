"use client";

import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Settings, FileText, PlayCircle, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { updateModuleOrder, updateLessonOrder, deleteLesson } from '@/utils/supabase/queries';
import { useRouter } from 'next/navigation';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

// Sortable Lesson Item
function SortableLessonItem({ lesson, module, openLessonModal, courseId, fetchCourse }: any) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="p-4 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors bg-white dark:bg-slate-900 z-10">
      <div className="flex items-center gap-4">
        <div {...attributes} {...listeners} aria-label="ลากเพื่อจัดลำดับบทเรียน" className="cursor-grab active:cursor-grabbing text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
            {lesson.type === 'slide' ? <FileText className="w-4 h-4" /> : 
             lesson.type === 'video_worksheet' ? <PlayCircle className="w-4 h-4" /> : 
             <HelpCircle className="w-4 h-4" />}
          </div>
          <span className="font-medium text-slate-700 dark:text-slate-200">{lesson.title}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
          {lesson.type === 'slide' ? 'ทฤษฎี' : lesson.type === 'video_worksheet' ? 'ปฏิบัติ (วิดีโอ+ใบงาน)' : 'แบบทดสอบ'}
        </span>
        <button 
          onClick={() => openLessonModal(module.id, lesson)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          ตั้งค่า
        </button>
        <button 
          onClick={() => router.push(`/admin/courses/${courseId}/lessons/${lesson.id}`)}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 px-3 py-1.5 border border-blue-200 dark:border-blue-800/50 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors bg-blue-50/50 dark:bg-blue-900/10"
        >
          {lesson.type === 'slide' ? <FileText className="w-3.5 h-3.5" /> : lesson.type === 'video_worksheet' ? <PlayCircle className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5" />}
          {(lesson.type === 'test' || lesson.type === 'quiz') ? 'เพิ่มข้อสอบ' : 'เพิ่มสื่อการสอน'}
        </button>
        <button 
          onClick={async () => {
            const confirmed = await confirmDialog({
              title: "ยืนยันการลบบทเรียน",
              message: `คุณแน่ใจหรือไม่ว่าต้องการลบบทเรียน "${lesson.title}"? การกระทำนี้ไม่สามารถย้อนกลับได้`,
              type: "danger",
              confirmText: "ลบบทเรียน"
            });
            if (confirmed) {
              await deleteLesson(lesson.id);
              toast.success("ลบบทเรียนเรียบร้อยแล้ว");
              if (fetchCourse) fetchCourse();
            }
          }}
          aria-label={`ลบบทเรียน ${lesson.title}`}
          className="flex items-center justify-center text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 w-8 h-8 border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors bg-red-50/50 dark:bg-red-900/10 shrink-0"
          title="ลบบทเรียน"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Sortable Module Item
function SortableModuleItem({ module, openModuleModal, openLessonModal, courseId, onLessonsReordered, fetchCourse }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onLessonsReordered(module.id, active.id as string, over.id as string);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm relative z-0">
      {/* Module Header */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between group">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white">{module.title}</h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => openModuleModal(module)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-700 dark:hover:border-blue-800 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            ตั้งค่าบทเรียน
          </button>
        </div>
      </div>

      {/* Lesson List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleLessonDragEnd}
        >
          <SortableContext 
            items={(module.lessons || []).map((l: any) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {(module.lessons || []).map((lesson: any) => (
              <SortableLessonItem 
                key={lesson.id} 
                lesson={lesson} 
                module={module} 
                openLessonModal={openLessonModal} 
                courseId={courseId} 
                fetchCourse={fetchCourse}
              />
            ))}
          </SortableContext>
        </DndContext>
        
        {/* Add Lesson Button */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20">
          <button 
            onClick={() => openLessonModal(module.id)}
            className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-blue-600 transition-all font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            เพิ่มเนื้อหาย่อย
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SortableCurriculum({ initialModules, courseId, openModuleModal, openLessonModal, fetchCourse }: any) {
  const [modules, setModules] = useState(initialModules);

  // Sync state when initialModules changes (e.g. after a save)
  useEffect(() => {
    setModules(initialModules);
  }, [initialModules]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleModuleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = modules.findIndex((m: any) => m.id === active.id);
      const newIndex = modules.findIndex((m: any) => m.id === over.id);
      
      const newModules = arrayMove(modules, oldIndex, newIndex);
      setModules(newModules);
      
      // Update DB
      const updates = newModules.map((m: any, index: number) => ({
        id: m.id,
        order_index: index
      }));
      await updateModuleOrder(updates);
      fetchCourse();
    }
  };

  const handleLessonsReordered = async (moduleId: string, activeId: string, overId: string) => {
    const moduleIndex = modules.findIndex((m: any) => m.id === moduleId);
    if (moduleIndex === -1) return;

    const moduleToUpdate = modules[moduleIndex];
    const oldIndex = moduleToUpdate.lessons.findIndex((l: any) => l.id === activeId);
    const newIndex = moduleToUpdate.lessons.findIndex((l: any) => l.id === overId);

    const newLessons = arrayMove(moduleToUpdate.lessons, oldIndex, newIndex);
    
    const newModules = [...modules];
    newModules[moduleIndex] = { ...moduleToUpdate, lessons: newLessons };
    setModules(newModules);

    // Update DB
    const updates = newLessons.map((l: any, index: number) => ({
      id: l.id,
      order_index: index
    }));
    await updateLessonOrder(updates);
    fetchCourse();
  };

  return (
    <div className="space-y-6">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleModuleDragEnd}
      >
        <SortableContext 
          items={modules.map((m: any) => m.id)}
          strategy={verticalListSortingStrategy}
        >
          {modules.map((module: any) => (
            <SortableModuleItem 
              key={module.id} 
              module={module} 
              openModuleModal={openModuleModal} 
              openLessonModal={openLessonModal} 
              courseId={courseId}
              onLessonsReordered={handleLessonsReordered}
              fetchCourse={fetchCourse}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add Module Button */}
      <button 
        onClick={() => openModuleModal()}
        className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 rounded-2xl flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all font-semibold"
      >
        <Plus className="w-5 h-5" />
        เพิ่มบทเรียน
      </button>
    </div>
  );
}
