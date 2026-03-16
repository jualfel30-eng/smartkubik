import React, { useRef, useState } from 'react';
import { SendHorizonal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

const DEFAULT_WELCOME = {
  role: 'assistant',
  content:
    '¡Hola! Soy el asistente de SmartKubik. Pregúntame sobre módulos, procesos o configuración y te ayudo en segundos.',
  sources: [],
};

const bubbleStyles = {
  assistant: 'bg-secondary text-secondary-foreground border border-primary/40',
  user: 'bg-primary text-primary-foreground',
  info: 'bg-muted text-muted-foreground border border-border',
};

/**
 * Reusable assistant chat panel — no fixed positioning.
 * Used inside Sheet (header) and AssistantPage (full page).
 */
const AssistantChatPanel = ({
  placeholder = 'Escribe tu pregunta…',
  className = '',
}) => {
  const [messages, setMessages] = useState([DEFAULT_WELCOME]);
  const [pendingQuestion, setPendingQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  };

  const appendMessage = (message) => {
    setMessages((prev) => [...prev, message]);
    scrollToBottom();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const question = pendingQuestion.trim();
    if (!question) return;

    appendMessage({ role: 'user', content: question });
    setPendingQuestion('');
    setIsSending(true);

    try {
      const response = await fetchApi('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          question,
          topK: 5,
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
        variant: 'info',
        content: 'No pude obtener una respuesta en este momento. Intenta nuevamente más tarde.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = (message, index) => {
    const role = message.role === 'assistant' && message.variant === 'info' ? 'info' : message.role;
    const alignmentClass = role === 'user' ? 'justify-end' : 'justify-start';
    const bubbleClass = bubbleStyles[role] ?? bubbleStyles.assistant;

    return (
      <div key={`${message.role}-${index}`} className={`flex ${alignmentClass}`}>
        <div
          className={`max-w-[85%] whitespace-pre-wrap rounded-md border px-3 py-2 text-sm shadow-sm ${bubbleClass}`}
        >
          <div className="flex items-center gap-2 pb-1 font-medium">
            {message.role === 'assistant' && <Sparkles className="h-3.5 w-3.5 text-primary" />}
            <span>{message.role === 'user' ? 'Tú' : 'Asistente'}</span>
          </div>
          <p>{message.content}</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-muted/50 px-4 py-3">
        {messages.map(renderMessage)}
        {isSending && <div className="text-xs text-muted-foreground">Pensando…</div>}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border bg-card px-3 py-3">
        <Input
          value={pendingQuestion}
          onChange={(event) => setPendingQuestion(event.target.value)}
          placeholder={placeholder}
          disabled={isSending}
        />
        <Button type="submit" size="icon" disabled={isSending || !pendingQuestion.trim()}>
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default AssistantChatPanel;
