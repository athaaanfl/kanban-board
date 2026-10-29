'use client';

import { useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface BoardData {
  todo: Task[];
  progress: Task[];
  done: Task[];
}

const columnConfig = {
  todo: { label: 'To Do', color: 'bg-gray-600' },
  progress: { label: 'In Progress', color: 'bg-blue-500' },
  done: { label: 'Done', color: 'bg-green-500' }
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Medium', color: 'bg-orange-100 text-orange-700' },
  high: { label: 'High', color: 'bg-red-100 text-red-700' }
};

export default function KanbanBoard() {
  const [board, setBoard] = useState<BoardData>({
    todo: [],
    progress: [],
    done: []
  });
  const [draggedItem, setDraggedItem] = useState<{ col: keyof BoardData; id: string } | null>(null);
  const [editingCard, setEditingCard] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('kanban');
    if (saved) {
      setBoard(JSON.parse(saved));
    }
  }, []);

  const saveBoard = (newBoard: BoardData) => {
    setBoard(newBoard);
    localStorage.setItem('kanban', JSON.stringify(newBoard));
  };

  const addCard = (col: keyof BoardData) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: 'New Task',
      description: 'Add description...',
      priority: 'medium'
    };
    saveBoard({ ...board, [col]: [...board[col], newTask] });
    setEditingCard(newTask.id);
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

  const handleDragStart = (col: keyof BoardData, id: string) => {
    setDraggedItem({ col, id });
  };

  const handleDrop = (targetCol: keyof BoardData) => {
    if (!draggedItem) return;

    const { col: fromCol, id } = draggedItem;
    if (fromCol === targetCol) {
      setDraggedItem(null);
      return;
    }

    const task = board[fromCol].find(t => t.id === id);
    if (!task) return;

    const newBoard = {
      ...board,
      [fromCol]: board[fromCol].filter(t => t.id !== id),
      [targetCol]: [...board[targetCol], task]
    };

    saveBoard(newBoard);
    setDraggedItem(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Kanban Board</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(Object.keys(columnConfig) as Array<keyof BoardData>).map(col => {
            const config = columnConfig[col];
            const tasks = board[col];
            
            return (
              <div key={col} className="flex flex-col">
                <div className={`${config.color} text-white rounded-lg px-4 py-2 flex items-center justify-between mb-4`}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{config.label}</span>
                    <span className="bg-white/20 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                      {tasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => addCard(col)}
                    className="hover:bg-white/10 rounded p-1 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                <div
                  className="flex-1 space-y-3 min-h-[400px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(col)}
                >
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(col, task.id)}
                      className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-move group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        {editingCard === task.id ? (
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => updateCard(col, task.id, { title: e.target.value })}
                            onBlur={() => setEditingCard(null)}
                            className="font-semibold text-gray-900 text-sm w-full outline-none border-b border-gray-300"
                            autoFocus
                          />
                        ) : (
                          <h3
                            onClick={() => setEditingCard(task.id)}
                            className="font-semibold text-gray-900 text-sm cursor-text"
                          >
                            {task.title}
                          </h3>
                        )}
                        <button
                          onClick={() => deleteCard(col, task.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <textarea
                        value={task.description}
                        onChange={(e) => updateCard(col, task.id, { description: e.target.value })}
                        className="text-gray-600 text-xs w-full resize-none outline-none mb-3"
                        rows={2}
                      />

                      <div className="flex items-center justify-between">
                        <input
                          type="date"
                          value={task.deadline || ''}
                          onChange={(e) => updateCard(col, task.id, { deadline: e.target.value })}
                          className="text-xs text-gray-500 outline-none cursor-pointer"
                        />
                        
                        <select
                          value={task.priority || 'medium'}
                          onChange={(e) => updateCard(col, task.id, { priority: e.target.value as Task['priority'] })}
                          className={`text-xs px-2 py-1 rounded-full font-medium cursor-pointer outline-none ${
                            priorityConfig[task.priority || 'medium'].color
                          }`}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
