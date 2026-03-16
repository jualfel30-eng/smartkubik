import { Sparkles } from 'lucide-react';
import AssistantChatPanel from '@/components/AssistantChatWidget.jsx';

export default function AssistantPage() {
  return (
    <div className="flex h-[calc(100vh-120px)] flex-col rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Asistente SmartKubik</h2>
      </div>
      <AssistantChatPanel />
    </div>
  );
}
