import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCashRegister } from '@/contexts/CashRegisterContext';
import { fadeUp } from '@/lib/motion';
import MobileCashOpenSession from './MobileCashOpenSession.jsx';
import MobileCashActiveSession from './MobileCashActiveSession.jsx';
import MobileCashCloseSession from './MobileCashCloseSession.jsx';
import MobileCashMovement from './MobileCashMovement.jsx';
import MobileCashHistory from './MobileCashHistory.jsx';

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 pb-28 space-y-4">
      <div className="h-8 w-32 rounded-lg bg-muted animate-pulse" />
      <div className="h-40 rounded-2xl bg-muted animate-pulse" />
      <div className="h-24 rounded-xl bg-muted animate-pulse" />
      <div className="h-24 rounded-xl bg-muted animate-pulse" />
    </div>
  );
}

export default function MobileCashRegisterPage() {
  const { currentSession, loading, hasActiveSession, refreshSession } = useCashRegister();
  const [showCloseSheet, setShowCloseSheet] = useState(false);
  const [showMovementSheet, setShowMovementSheet] = useState(false);
  const [showHistorySheet, setShowHistorySheet] = useState(false);

  if (loading) return <LoadingSkeleton />;

  return (
    <motion.div
      className="min-h-screen bg-background"
      variants={fadeUp}
      initial="initial"
      animate="animate"
    >
      {!hasActiveSession ? (
        <MobileCashOpenSession onOpened={refreshSession} />
      ) : (
        <MobileCashActiveSession
          session={currentSession}
          onRefresh={refreshSession}
          onClose={() => setShowCloseSheet(true)}
          onMovement={() => setShowMovementSheet(true)}
          onHistory={() => setShowHistorySheet(true)}
        />
      )}

      <MobileCashCloseSession
        open={showCloseSheet}
        onClose={() => setShowCloseSheet(false)}
        session={currentSession}
        onSuccess={() => { setShowCloseSheet(false); refreshSession(); }}
      />

      <MobileCashMovement
        open={showMovementSheet}
        onClose={() => setShowMovementSheet(false)}
        session={currentSession}
        onSuccess={() => { setShowMovementSheet(false); refreshSession(); }}
      />

      <MobileCashHistory
        open={showHistorySheet}
        onClose={() => setShowHistorySheet(false)}
      />
    </motion.div>
  );
}
