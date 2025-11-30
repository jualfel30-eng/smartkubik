
import { useState, useMemo, useEffect } from 'react';
import { useTodos } from '../hooks/use-todos.js';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trash2, Plus, Edit, Calendar, Filter, X, ChevronDown, ChevronUp, Archive } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarUI } from './ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

const TAG_OPTIONS = [
  { value: 'pagos', label: 'Pagos', color: 'bg-red-500' },
  { value: 'compras', label: 'Compras', color: 'bg-blue-500' },
  { value: 'fiscal', label: 'Fiscal', color: 'bg-purple-500' },
  { value: 'legal', label: 'Legal', color: 'bg-amber-500' },
  { value: 'produccion', label: 'Producción', color: 'bg-green-500' },
  { value: 'mantenimiento', label: 'Mantenimiento', color: 'bg-orange-500' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baja', color: 'text-gray-500' },
  { value: 'medium', label: 'Media', color: 'text-yellow-500' },
  { value: 'high', label: 'Alta', color: 'text-red-500' },
];

export function TodoList({ onTodoComplete }) {
  const { todos, addTodo, updateTodo, deleteTodo, loading, error } = useTodos();
  const [filterTag, setFilterTag] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(null);
  const [formTags, setFormTags] = useState([]);
  const [formPriority, setFormPriority] = useState('medium');

  // Custom tags
  const [customTags, setCustomTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');

  // Load custom tags from localStorage on mount
  useEffect(() => {
    const savedTags = localStorage.getItem('customTodoTags');
    if (savedTags) {
      try {
        setCustomTags(JSON.parse(savedTags));
      } catch (e) {
        console.error('Error loading custom tags:', e);
      }
    }
  }, []);

  // Save custom tags to localStorage when they change
  useEffect(() => {
    if (customTags.length > 0) {
      localStorage.setItem('customTodoTags', JSON.stringify(customTags));
    }
  }, [customTags]);

  const resetForm = () => {
    setFormTitle('');
    setFormDate(null);
    setFormTags([]);
    setFormPriority('medium');
    setEditingTodo(null);
  };

  const openNewTodoDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (todo) => {
    setEditingTodo(todo);
    setFormTitle(todo.title);
    setFormDate(todo.dueDate ? new Date(todo.dueDate) : null);
    setFormTags(todo.tags || []);
    setFormPriority(todo.priority || 'medium');
    setIsDialogOpen(true);
  };

  const handleSaveTodo = () => {
    if (!formTitle.trim()) return;

    const todoData = {
      title: formTitle.trim(),
      dueDate: formDate ? formDate.toISOString() : undefined,
      tags: formTags,
      priority: formPriority,
    };

    if (editingTodo) {
      updateTodo(editingTodo._id, todoData);
    } else {
      addTodo(todoData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleToggleTodo = async (id, isCompleted) => {
    await updateTodo(id, { isCompleted: !isCompleted });

    // Si se completó la tarea y hay callback, refrescar eventos del calendario
    if (!isCompleted && onTodoComplete) {
      onTodoComplete();
    }
  };

  const toggleFormTag = (tag) => {
    setFormTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    if (!newTagName.trim()) return;

    const tagValue = newTagName.toLowerCase().trim().replace(/\s+/g, '-');

    // Check if tag already exists
    if (allTags.some(t => t.value === tagValue)) {
      setNewTagName('');
      return;
    }

    const newTag = {
      value: tagValue,
      label: newTagName.trim(),
      color: 'bg-indigo-500',
      custom: true
    };

    setCustomTags(prev => [...prev, newTag]);
    setFormTags(prev => [...prev, tagValue]);
    setNewTagName('');
  };

  const allTags = [...TAG_OPTIONS, ...customTags];

  const getTagColor = (tag) => {
    return allTags.find(t => t.value === tag)?.color || 'bg-gray-500';
  };

  const getTagLabel = (tag) => {
    return allTags.find(t => t.value === tag)?.label || tag;
  };

  const getPriorityColor = (priority) => {
    return PRIORITY_OPTIONS.find(p => p.value === priority)?.color || 'text-gray-500';
  };

  const filteredTodos = useMemo(() => {
    if (filterTag === 'all') return todos;
    return todos.filter(todo => todo.tags?.includes(filterTag));
  }, [todos, filterTag]);

  const pendingTodos = useMemo(() => {
    return filteredTodos.filter(todo => !todo.isCompleted);
  }, [filteredTodos]);

  const completedTodos = useMemo(() => {
    return filteredTodos.filter(todo => todo.isCompleted);
  }, [filteredTodos]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Lista de Tareas</CardTitle>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Filtrar por etiqueta:</p>
                  <Select value={filterTag} onValueChange={setFilterTag}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {allTags.map(tag => (
                        <SelectItem key={tag.value} value={tag.value}>
                          {tag.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>

            <Button onClick={openNewTodoDialog} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tarea
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && <p>Cargando tareas...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {/* Tareas Pendientes */}
        <div className="space-y-2">
          {pendingTodos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay tareas pendientes</p>
          ) : (
            pendingTodos.map(todo => (
              <div key={todo._id} className="flex flex-col space-y-1 p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 border">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={todo._id}
                    checked={todo.isCompleted}
                    onCheckedChange={() => handleToggleTodo(todo._id, todo.isCompleted)}
                  />
                  <label
                    htmlFor={todo._id}
                    className={`flex-1 text-sm font-medium leading-none cursor-pointer ${getPriorityColor(todo.priority || 'medium')}`}>
                    {todo.title}
                  </label>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(todo)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteTodo(todo._id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pl-8">
                  {todo.dueDate && (
                    <span className="text-xs text-muted-foreground flex items-center flex-shrink-0">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(todo.dueDate), 'PPP', { locale: es })}
                    </span>
                  )}
                  {todo.tags?.map(tag => (
                    <Badge key={tag} className={`${getTagColor(tag)} text-xs flex-shrink-0`}>
                      {getTagLabel(tag)}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tareas Completadas - Sección Colapsable */}
        {completedTodos.length > 0 && (
          <div className="mt-6 pt-4 border-t dark:border-gray-700">
            <Button
              variant="ghost"
              className="w-full justify-between hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setShowCompleted(!showCompleted)}
            >
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Tareas Completadas ({completedTodos.length})
                </span>
              </div>
              {showCompleted ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showCompleted && (
              <div className="space-y-2 mt-3">
                {completedTodos.map(todo => (
                  <div key={todo._id} className="flex flex-col space-y-1 p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 border border-dashed opacity-60">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`completed-${todo._id}`}
                        checked={todo.isCompleted}
                        onCheckedChange={() => handleToggleTodo(todo._id, todo.isCompleted)}
                      />
                      <label
                        htmlFor={`completed-${todo._id}`}
                        className="flex-1 text-sm font-medium leading-none cursor-pointer line-through text-muted-foreground">
                        {todo.title}
                      </label>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => deleteTodo(todo._id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-8">
                      {todo.dueDate && (
                        <span className="text-xs text-muted-foreground flex items-center flex-shrink-0">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(todo.dueDate), 'PPP', { locale: es })}
                        </span>
                      )}
                      {todo.tags?.map(tag => (
                        <Badge key={tag} className={`${getTagColor(tag)} text-xs opacity-60 flex-shrink-0`}>
                          {getTagLabel(tag)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dialog para crear/editar */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTodo ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
              <DialogDescription>
                {editingTodo ? 'Modifica los detalles de la tarea' : 'Crea una nueva tarea con fecha y etiquetas'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Ej: Revisar facturas del mes"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveTodo()}
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha de vencimiento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formDate ? format(formDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarUI
                      mode="single"
                      selected={formDate}
                      onSelect={setFormDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {formDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormDate(null)}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Quitar fecha
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Etiquetas</Label>
                <div className="grid grid-cols-2 gap-2">
                  {allTags.map(tag => (
                    <div
                      key={tag.value}
                      onClick={() => toggleFormTag(tag.value)}
                      className={`flex items-center space-x-2 p-2 rounded-md border cursor-pointer transition-colors ${
                        formTags.includes(tag.value)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Checkbox
                        checked={formTags.includes(tag.value)}
                        onCheckedChange={() => toggleFormTag(tag.value)}
                      />
                      <Badge className={tag.color}>{tag.label}</Badge>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t">
                  <Label className="text-xs text-muted-foreground mb-2">Crear nueva etiqueta</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Ej: Recursos Humanos"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={addCustomTag}
                      disabled={!newTagName.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <span className={priority.color}>{priority.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTodo} disabled={!formTitle.trim()}>
                {editingTodo ? 'Guardar Cambios' : 'Crear Tarea'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
