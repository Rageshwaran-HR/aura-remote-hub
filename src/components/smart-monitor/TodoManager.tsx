import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CheckSquare, Plus, Edit, Trash2, Clock, Bell } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

interface TodoItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
}

interface Alarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  repeat: string[];
}

export const TodoManager: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([
    {
      id: '1',
      title: 'Update monitor firmware',
      description: 'Check for latest firmware updates',
      completed: false,
      priority: 'high',
      dueDate: '2024-07-21',
      createdAt: '2024-07-20'
    },
    {
      id: '2',
      title: 'Clean screen',
      description: 'Weekly screen cleaning routine',
      completed: true,
      priority: 'medium',
      createdAt: '2024-07-19'
    }
  ]);

  const [alarms, setAlarms] = useState<Alarm[]>([
    {
      id: '1',
      time: '07:00',
      label: 'Morning routine',
      enabled: true,
      repeat: ['mon', 'tue', 'wed', 'thu', 'fri']
    },
    {
      id: '2',
      time: '22:00',
      label: 'Sleep time',
      enabled: true,
      repeat: ['daily']
    }
  ]);

  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: ''
  });

  const [newAlarm, setNewAlarm] = useState({
    time: '',
    label: '',
    repeat: 'daily'
  });

  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [isAddingAlarm, setIsAddingAlarm] = useState(false);

  const addTodo = async () => {
    if (!newTodo.title.trim()) return;

    const todo: TodoItem = {
      id: Date.now().toString(),
      title: newTodo.title,
      description: newTodo.description,
      completed: false,
      priority: newTodo.priority,
      dueDate: newTodo.dueDate || undefined,
      createdAt: new Date().toISOString().split('T')[0]
    };

    try {
      await axios.post('/api/todo/add', todo);
      
      setTodos(prev => [...prev, todo]);
      setNewTodo({ title: '', description: '', priority: 'medium', dueDate: '' });
      setIsAddingTodo(false);
      
      toast({
        title: "Todo Added",
        description: "New task added successfully",
      });
    } catch (error) {
      console.error('Failed to add todo:', error);
      toast({
        title: "Error",
        description: "Failed to add todo",
        variant: "destructive"
      });
    }
  };

  const toggleTodo = async (id: string) => {
    try {
      const updatedTodos = todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      );
      
      setTodos(updatedTodos);
      
      await axios.post('/api/todo/toggle', { id });
      
      const todo = todos.find(t => t.id === id);
      toast({
        title: todo?.completed ? "Task Incomplete" : "Task Completed",
        description: todo?.title,
      });
    } catch (error) {
      console.error('Failed to toggle todo:', error);
      toast({
        title: "Error",
        description: "Failed to update todo",
        variant: "destructive"
      });
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await axios.delete(`/api/todo/${id}`);
      
      setTodos(prev => prev.filter(todo => todo.id !== id));
      
      toast({
        title: "Todo Deleted",
        description: "Task removed successfully",
      });
    } catch (error) {
      console.error('Failed to delete todo:', error);
      toast({
        title: "Error",
        description: "Failed to delete todo",
        variant: "destructive"
      });
    }
  };

  const addAlarm = async () => {
    if (!newAlarm.time || !newAlarm.label) return;

    const alarm: Alarm = {
      id: Date.now().toString(),
      time: newAlarm.time,
      label: newAlarm.label,
      enabled: true,
      repeat: newAlarm.repeat === 'daily' ? ['daily'] : ['mon', 'tue', 'wed', 'thu', 'fri']
    };

    try {
      await axios.post('/api/alarm/add', alarm);
      
      setAlarms(prev => [...prev, alarm]);
      setNewAlarm({ time: '', label: '', repeat: 'daily' });
      setIsAddingAlarm(false);
      
      toast({
        title: "Alarm Added",
        description: `Alarm set for ${newAlarm.time}`,
      });
    } catch (error) {
      console.error('Failed to add alarm:', error);
      toast({
        title: "Error",
        description: "Failed to add alarm",
        variant: "destructive"
      });
    }
  };

  const toggleAlarm = async (id: string) => {
    try {
      const updatedAlarms = alarms.map(alarm =>
        alarm.id === id ? { ...alarm, enabled: !alarm.enabled } : alarm
      );
      
      setAlarms(updatedAlarms);
      
      await axios.post('/api/alarm/toggle', { id });
      
      const alarm = alarms.find(a => a.id === id);
      toast({
        title: alarm?.enabled ? "Alarm Disabled" : "Alarm Enabled",
        description: alarm?.label,
      });
    } catch (error) {
      console.error('Failed to toggle alarm:', error);
      toast({
        title: "Error",
        description: "Failed to update alarm",
        variant: "destructive"
      });
    }
  };

  const deleteAlarm = async (id: string) => {
    try {
      await axios.delete(`/api/alarm/${id}`);
      
      setAlarms(prev => prev.filter(alarm => alarm.id !== id));
      
      toast({
        title: "Alarm Deleted",
        description: "Alarm removed successfully",
      });
    } catch (error) {
      console.error('Failed to delete alarm:', error);
      toast({
        title: "Error",
        description: "Failed to delete alarm",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-primary text-primary-foreground';
      case 'low': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg">
              <CheckSquare className="h-5 w-5 text-primary" />
              Todo List
            </span>
            <Dialog open={isAddingTodo} onOpenChange={setIsAddingTodo}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Todo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Task title"
                    value={newTodo.title}
                    onChange={(e) => setNewTodo(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={newTodo.description}
                    onChange={(e) => setNewTodo(prev => ({ ...prev, description: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Select value={newTodo.priority} onValueChange={(value: any) => setNewTodo(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={newTodo.dueDate}
                      onChange={(e) => setNewTodo(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                  <Button onClick={addTodo} className="w-full">
                    Add Todo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${
                  todo.completed ? 'bg-muted/50 opacity-60' : 'bg-card'
                }`}
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggleTodo(todo.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-medium text-sm ${todo.completed ? 'line-through' : ''}`}>
                      {todo.title}
                    </h4>
                    <Badge className={`text-xs ${getPriorityColor(todo.priority)}`}>
                      {todo.priority}
                    </Badge>
                  </div>
                  {todo.description && (
                    <p className="text-xs text-muted-foreground mb-2">{todo.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {todo.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {todo.dueDate}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteTodo(todo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {todos.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No todos yet. Add one to get started!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-primary" />
              Alarms
            </span>
            <Dialog open={isAddingAlarm} onOpenChange={setIsAddingAlarm}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Alarm</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    type="time"
                    value={newAlarm.time}
                    onChange={(e) => setNewAlarm(prev => ({ ...prev, time: e.target.value }))}
                  />
                  <Input
                    placeholder="Alarm label"
                    value={newAlarm.label}
                    onChange={(e) => setNewAlarm(prev => ({ ...prev, label: e.target.value }))}
                  />
                  <Select value={newAlarm.repeat} onValueChange={(value) => setNewAlarm(prev => ({ ...prev, repeat: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekdays">Weekdays</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addAlarm} className="w-full">
                    Add Alarm
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alarms.map((alarm) => (
              <div
                key={alarm.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                  alarm.enabled ? 'bg-card' : 'bg-muted/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className={`h-5 w-5 ${alarm.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <h4 className="font-medium text-sm">{alarm.time}</h4>
                    <p className="text-xs text-muted-foreground">{alarm.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {alarm.repeat.includes('daily') ? 'Daily' : 'Weekdays'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={alarm.enabled}
                    onCheckedChange={() => toggleAlarm(alarm.id)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteAlarm(alarm.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {alarms.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No alarms set. Add one to get started!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};