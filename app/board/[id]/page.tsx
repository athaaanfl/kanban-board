'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Copy, Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  labels?: string[];
  order: number;
}

interface BoardData {
  todo: Task[];
  progress: Task[];
  done: Task[];
}

const columnConfig = {
  todo: { label: 'To Do', color: 'bg-slate-100 border-slate-200' },
  progress: { label: 'In Progress', color: 'bg-blue-50 border-blue-200' },
  done: { label: 'Done', color: 'bg-green-50 border-green-200' }
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' }
};

function TaskCard({ task, column, onUpdate, onDelete }: {
  task: Task;
  column: keyof BoardData;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [descValue, setDescValue] = useState(task.description);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleTitleSave = () => {
    if (titleValue.trim()) {
      onUpdate(task.id, { title: titleValue.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDescSave = () => {
    onUpdate(task.id, { description: descValue.trim() });
    setIsEditingDescription(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all group",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          {isEditingTitle ? (
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setTitleValue(task.title);
                  setIsEditingTitle(false);
                }
              }}
              className="font-medium text-sm w-full outline-none border-b border-slate-300 bg-transparent"
              autoFocus
              placeholder="Task title"
            />
          ) : (
            <h3
              onClick={() => {
                setIsEditingTitle(true);
                setTitleValue(task.title);
              }}
              className="font-medium text-sm text-slate-900 cursor-text hover:text-slate-700"
            >
              {task.title}
            </h3>
          )}
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all ml-2 p-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {isEditingDescription ? (
        <textarea
          value={descValue}
          onChange={(e) => setDescValue(e.target.value)}
          onBlur={handleDescSave}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setDescValue(task.description);
              setIsEditingDescription(false);
            }
          }}
          className="text-xs text-slate-600 w-full resize-none outline-none mb-2 border-b border-slate-200 bg-transparent"
          rows={2}
          placeholder="Add description..."
        />
      ) : (
        <p
          onClick={() => {
            setIsEditingDescription(true);
            setDescValue(task.description);
          }}
          className={cn(
            "text-xs mb-2 cursor-text hover:text-slate-700 transition-colors",
            task.description ? "text-slate-600" : "text-slate-400 italic"
          )}
        >
          {task.description || "Add description..."}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 text-xs">
        <input
          type="date"
          value={task.deadline || ''}
          onChange={(e) => onUpdate(task.id, { deadline: e.target.value })}
          className="text-xs text-slate-500 outline-none cursor-pointer border border-slate-200 rounded px-1.5 py-0.5"
        />
        
        <select
          value={task.priority || 'medium'}
          onChange={(e) => onUpdate(task.id, { priority: e.target.value as Task['priority'] })}
          className={cn(
            "text-xs px-2 py-0.5 rounded-md font-medium cursor-pointer outline-none border",
            priorityConfig[task.priority || 'medium'].color
          )}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
    </div>
  );
}

function KanbanBoard() {
  const params = useParams();
  const boardId = params.id as string;
  
  const [board, setBoard] = useState<BoardData>({
    todo: [],
    progress: [],
    done: []
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const loadBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/board/${boardId}`);
      if (res.ok) {
        const data = await res.json();
        
        // Migration: add order field to tasks that don't have it
        const migrateColumn = (tasks: Task[]) => {
          return tasks.map((task, index) => ({
            ...task,
            order: task.order !== undefined ? task.order : index
          })).sort((a, b) => a.order - b.order);
        };
        
        const sortedData: BoardData = {
          todo: migrateColumn(data.todo || []),
          progress: migrateColumn(data.progress || []),
          done: migrateColumn(data.done || [])
        };
        
        setBoard(sortedData);
        
        // Save migrated data back if any tasks were missing order
        const needsMigration = 
          (data.todo || []).some((t: Task) => t.order === undefined) ||
          (data.progress || []).some((t: Task) => t.order === undefined) ||
          (data.done || []).some((t: Task) => t.order === undefined);
        
        if (needsMigration) {
          await fetch(`/api/board/${boardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sortedData)
          });
        }
      }
    } catch (error) {
      console.error('Failed to load board', error);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const saveBoard = async (newBoard: BoardData) => {
    setBoard(newBoard);
    setSaveStatus('saving');
    
    try {
      await fetch(`/api/board/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBoard)
      });
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
    }
  };

  const addCard = (col: keyof BoardData) => {
    const maxOrder = board[col].reduce((max, task) => Math.max(max, task.order || 0), 0);
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: '',
      description: '',
      priority: 'medium',
      order: maxOrder + 1
    };
    const newBoard = { ...board, [col]: [...board[col], newTask] };
    saveBoard(newBoard);
    
    // Auto-focus on new card title after a short delay
    setTimeout(() => {
      const cards = document.querySelectorAll(`[data-column="${col}"] h3`);
      const lastCard = cards[cards.length - 1] as HTMLElement;
      if (lastCard) lastCard.click();
    }, 100);
  };

  const updateCard = (col: keyof BoardData, id: string, updates: Partial<Task>) => {
    const updated = board[col].map(task =>
      task.id === id ? { ...task, ...updates } : task
    );
    saveBoard({ ...board, [col]: updated });
  };

  const deleteCard = (col: keyof BoardData, id: string) => {
    const filtered = board[col].filter(task => task.id !== id);
    saveBoard({ ...board, [col]: filtered });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source column and task
    let sourceCol: keyof BoardData | null = null;
    let activeTask: Task | null = null;

    for (const col of Object.keys(board) as Array<keyof BoardData>) {
      const task = board[col].find(t => t.id === activeId);
      if (task) {
        sourceCol = col;
        activeTask = task;
        break;
      }
    }

    if (!sourceCol || !activeTask) return;

    // Determine target column
    let targetCol: keyof BoardData = sourceCol;
    if (overId === 'todo' || overId === 'progress' || overId === 'done') {
      targetCol = overId as keyof BoardData;
    } else {
      // Find which column contains the over task
      for (const col of Object.keys(board) as Array<keyof BoardData>) {
        if (board[col].find(t => t.id === overId)) {
          targetCol = col;
          break;
        }
      }
    }

    // Same position, no change
    if (sourceCol === targetCol && activeId === overId) return;

    const newBoard = { ...board };

    if (sourceCol === targetCol) {
      // Reorder within same column
      const items = [...newBoard[sourceCol]];
      const oldIndex = items.findIndex(t => t.id === activeId);
      const newIndex = items.findIndex(t => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const [removed] = items.splice(oldIndex, 1);
        items.splice(newIndex, 0, removed);
        // Update order
        items.forEach((task, index) => {
          task.order = index;
        });
        newBoard[sourceCol] = items;
      }
    } else {
      // Move to different column
      newBoard[sourceCol] = newBoard[sourceCol].filter(t => t.id !== activeId);
      const targetIndex = newBoard[targetCol].findIndex(t => t.id === overId);
      
      if (targetIndex !== -1) {
        newBoard[targetCol].splice(targetIndex + 1, 0, activeTask);
      } else {
        newBoard[targetCol].push(activeTask);
      }

      // Update order for both columns
      newBoard[sourceCol].forEach((task, index) => {
        task.order = index;
      });
      newBoard[targetCol].forEach((task, index) => {
        task.order = index;
      });
    }

    saveBoard(newBoard);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('saved'), 2000);
  };

  const activeTask = activeId ? 
    [...board.todo, ...board.progress, ...board.done].find(t => t.id === activeId) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">Kanban Board</h1>
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-xs font-medium flex items-center gap-1.5",
                saveStatus === 'saved' && 'text-green-600',
                saveStatus === 'saving' && 'text-blue-600',
                saveStatus === 'error' && 'text-red-600'
              )}>
                {saveStatus === 'saved' && <><Check className="w-3.5 h-3.5" /> Saved</>}
                {saveStatus === 'saving' && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving</>}
                {saveStatus === 'error' && <><X className="w-3.5 h-3.5" /> Error</>}
              </span>
              <button
                onClick={copyLink}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Link
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(columnConfig) as Array<keyof BoardData>).map(col => {
              const config = columnConfig[col];
              const tasks = board[col];
              
              return (
                <div key={col} className="flex flex-col">
                  <div className={cn(
                    "border rounded-lg px-3 py-2 flex items-center justify-between mb-3",
                    config.color
                  )}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-700">{config.label}</span>
                      <span className="bg-white/60 text-slate-600 text-xs font-medium px-1.5 py-0.5 rounded">
                        {tasks.length}
                      </span>
                    </div>
                    <button
                      onClick={() => addCard(col)}
                      className="hover:bg-white/60 rounded p-1 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>

                  <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div
                      className="flex-1 space-y-2 min-h-[400px] p-1"
                      id={col}
                      data-column={col}
                    >
                      {tasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          column={col}
                          onUpdate={(id, updates) => updateCard(col, id, updates)}
                          onDelete={(id) => deleteCard(col, id)}
                        />
                      ))}
                      {tasks.length === 0 && (
                        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                          No tasks yet
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-lg w-[300px] rotate-3">
            <h3 className="font-medium text-sm text-slate-900 mb-1">{activeTask.title}</h3>
            <p className="text-xs text-slate-600">{activeTask.description || "No description"}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    }>
      <KanbanBoard />
    </Suspense>
  );
}
