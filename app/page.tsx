'use client';

import { useState, useEffect } from 'react';

interface Task {
  id: string;
  content: string;
}

interface BoardData {
  todo: Task[];
  progress: Task[];
  done: Task[];
}

export default function KanbanBoard() {
  const [board, setBoard] = useState<BoardData>({
    todo: [],
    progress: [],
    done: []
  });
  const [draggedItem, setDraggedItem] = useState<{ col: keyof BoardData; id: string } | null>(null);

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
      content: 'New task'
    };
    saveBoard({ ...board, [col]: [...board[col], newTask] });
  };

  const updateCard = (col: keyof BoardData, id: string, content: string) => {
    const updated = board[col].map(task =>
      task.id === id ? { ...task, content } : task
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Kanban Board</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['todo', 'progress', 'done'] as const).map(col => (
            <div
              key={col}
              className="bg-slate-800/50 backdrop-blur rounded-lg p-4 min-h-[500px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col)}
            >
              <h2 className="text-xl font-semibold text-white mb-4 uppercase tracking-wide">
                {col === 'todo' ? 'To Do' : col === 'progress' ? 'In Progress' : 'Done'}
              </h2>

              <div className="space-y-3 mb-4">
                {board[col].map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(col, task.id)}
                    className="bg-slate-700 rounded-lg p-3 cursor-move hover:bg-slate-600 transition-colors group relative"
                  >
                    <button
                      onClick={() => deleteCard(col, task.id)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    <textarea
                      value={task.content}
                      onChange={(e) => updateCard(col, task.id, e.target.value)}
                      className="w-full bg-transparent text-white resize-none outline-none pr-6"
                      rows={2}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => addCard(col)}
                className="w-full py-2 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-purple-500 hover:text-purple-400 transition-colors"
              >
                + Add card
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
