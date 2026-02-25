import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, SendHorizonal, RotateCcw, BarChart3, HeartPulse, TrendingUp, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    'Soy tu **Chief Growth Officer virtual**. Pregúntame sobre estrategia de crecimiento, métricas del funnel, health scores de tenants, marketing, retención, o cualquier decisión de negocio para SmartKubik.\n\nPuedo consultar datos reales de la plataforma para fundamentar mis recomendaciones.',
  sources: [],
};

const QUICK_ACTIONS = [
  { label: 'Funnel de hoy', icon: BarChart3, question: '¿Cómo va el funnel de adquisición? Dame un resumen con los datos actuales.' },
  { label: 'Tenants en riesgo', icon: HeartPulse, question: 'Muéstrame los tenants con peor health score que podrían estar en riesgo de churn.' },
  { label: 'Métricas plataforma', icon: TrendingUp, question: '¿Cuáles son las métricas generales de la plataforma hoy?' },
  { label: 'Ideas de la semana', icon: Lightbulb, question: 'Basándote en la estrategia de crecimiento, ¿qué acciones concretas debería ejecutar esta semana?' },
];

const MAX_HISTORY = 20;

const bubbleStyles = {
  assistant: 'bg-secondary text-secondary-foreground border border-primary/30',
  user: 'bg-primary text-primary-foreground',
};

function formatMessageContent(content) {
  if (!content) return '';
  return content
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '\n• ')
    .replace(/\n(\d+)\. /g, '\n$1. ')
    .replace(/\n/g, '<br/>');
}

const SuperAdminAssistant = () => {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [pendingQuestion, setPendingQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const appendMessage = (message) => {
    setMessages((prev) => [...prev, message]);
  };

  const buildConversationHistory = () => {
    return messages
      .filter((m) => m !== WELCOME_MESSAGE)
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content }));
  };

  const sendQuestion = async (question) => {
    if (!question?.trim()) return;

    appendMessage({ role: 'user', content: question });
    setPendingQuestion('');
    setIsSending(true);

    const conversationHistory = buildConversationHistory();

    try {
      const response = await fetchApi('/super-admin/assistant/query', {
        method: 'POST',
        body: JSON.stringify({
          question,
          conversationHistory,
          topK: 8,
        }),
      });

      const payload = response?.data;
      const answer = payload?.answer || 'No encontré una respuesta para esa consulta.';
      appendMessage({
        role: 'assistant',
        content: answer,
        sources: Array.isArray(payload?.sources) ? payload.sources : [],
      });
    } catch (error) {
      toast.error('El asistente no pudo responder', { description: error.message });
      appendMessage({
        role: 'assistant',
        content: 'No pude obtener una respuesta en este momento. Intenta nuevamente más tarde.',
      });
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendQuestion(pendingQuestion.trim());
  };

  const handleQuickAction = (question) => {
    if (isSending) return;
    sendQuestion(question);
  };

  const handleClearConversation = () => {
    setMessages([WELCOME_MESSAGE]);
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const alignmentClass = isUser ? 'justify-end' : 'justify-start';
    const bubbleClass = bubbleStyles[message.role] ?? bubbleStyles.assistant;
    const sources = Array.isArray(message.sources) ? message.sources : [];

    return (
      <div key={`${message.role}-${index}`} className={`flex ${alignmentClass}`}>
        <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm shadow-sm ${bubbleClass}`}>
          <div className="flex items-center gap-2 pb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
            {!isUser && <Sparkles className="h-3 w-3" />}
            <span>{isUser ? 'Tú' : 'CGO Virtual'}</span>
          </div>
          <div
            className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
          />
          {sources.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-border/40 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Fuentes</p>
              <ul className="space-y-1 text-xs opacity-70">
                {sources.map((source, idx) => (
                  <li key={idx} className="list-disc pl-4">
                    <span className="font-medium">{source.source || `Doc ${idx + 1}`}:</span>{' '}
                    <span>{source.snippet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Asistente de Negocio</h1>
            <p className="text-sm text-muted-foreground">CGO Virtual — Estrategia y Crecimiento</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClearConversation} title="Limpiar conversación">
          <RotateCcw className="mr-2 h-4 w-4" />
          Nueva conversación
        </Button>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-4">
        {messages.map(renderMessage)}
        {isSending && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
                Analizando…
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && !isSending && (
        <div className="flex flex-wrap gap-2 pb-3">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action.question)}
              className="text-xs"
            >
              <action.icon className="mr-1.5 h-3.5 w-3.5" />
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <Card className="border-t-0 rounded-t-none">
        <form onSubmit={handleSubmit} className="flex items-center gap-3 p-3">
          <Input
            ref={inputRef}
            value={pendingQuestion}
            onChange={(event) => setPendingQuestion(event.target.value)}
            placeholder="Pregunta sobre estrategia, métricas, marketing, retención…"
            disabled={isSending}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isSending || !pendingQuestion.trim()}>
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default SuperAdminAssistant;
