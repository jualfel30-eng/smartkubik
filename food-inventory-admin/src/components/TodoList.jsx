
import { useState } from 'react';
import { useTodos } from '../hooks/use-todos.js';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trash2, Plus, Edit, Save } from 'lucide-react';

export function TodoList() {
  const { todos, addTodo, updateTodo, deleteTodo, loading, error } = useTodos();
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const handleAddTodo = () => {
    if (newTodoTitle.trim()) {
      addTodo(newTodoTitle.trim());
      setNewTodoTitle('');
    }
  };

  const handleToggleTodo = (id, isCompleted) => {
    updateTodo(id, { isCompleted: !isCompleted });
  };

  const handleStartEditing = (todo) => {
    setEditingTodoId(todo._id);
    setEditingText(todo.title);
  };

  const handleCancelEditing = () => {
    setEditingTodoId(null);
    setEditingText('');
  };

  const handleSaveEdit = () => {
    if (editingTodoId && editingText.trim()) {
      updateTodo(editingTodoId, { title: editingText.trim() });
      handleCancelEditing();
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Tareas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex w-full max-w-sm items-center space-x-2 mb-4">
          <Input 
            type="text"
            placeholder="Nueva tarea..."
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
          />
          <Button type="submit" onClick={handleAddTodo}><Plus className="h-4 w-4" /></Button>
        </div>

        {loading && <p>Cargando tareas...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="space-y-2">
          {todos.map(todo => (
            <div key={todo._id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
              <Checkbox 
                id={todo._id}
                checked={todo.isCompleted}
                onCheckedChange={() => handleToggleTodo(todo._id, todo.isCompleted)}
              />
              {editingTodoId === todo._id ? (
                <Input
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                  onBlur={handleSaveEdit} // Save when focus is lost
                  autoFocus
                  className="flex-1 h-8"
                />
              ) : (
                <label 
                  htmlFor={todo._id} 
                  className={`flex-1 text-sm font-medium leading-none ${todo.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                  {todo.title}
                </label>
              )}
              
              <div className="flex items-center">
                {editingTodoId === todo._id ? (
                  <Button variant="ghost" size="sm" onClick={handleSaveEdit}>
                    <Save className="h-4 w-4 text-green-500" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => handleStartEditing(todo)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => deleteTodo(todo._id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
