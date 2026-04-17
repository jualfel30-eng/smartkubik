import { motion } from 'framer-motion';
import { SPRING } from '@/lib/motion';
import haptics from '@/lib/haptics';

export default function MobileToggleRow({
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  icon: Icon,
}) {
  const handleToggle = () => {
    if (disabled) return;
    haptics.select();
    onChange(!checked);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      className="w-full flex items-center gap-3 py-3 no-tap-highlight disabled:opacity-50"
    >
      {Icon && <Icon size={18} className="text-muted-foreground shrink-0" />}
      <div className="flex-1 text-left min-w-0">
        <span className="text-sm font-medium block">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground block mt-0.5">{description}</span>
        )}
      </div>
      <div
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${
          checked ? 'bg-primary' : 'bg-muted-foreground/30'
        }`}
      >
        <motion.span
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
          animate={{ x: checked ? 20 : 0 }}
          transition={SPRING.snappy}
        />
      </div>
    </button>
  );
}
