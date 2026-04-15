import { toast as sonner } from 'sonner';
import haptics from './haptics';

const wrap = (fn, haptic) => (message, opts) => {
  if (haptic) haptic();
  return fn(message, opts);
};

const toast = Object.assign(
  (message, opts) => sonner(message, opts),
  {
    success: wrap(sonner.success, haptics.success),
    error: wrap(sonner.error, haptics.error),
    warning: wrap(sonner.warning, haptics.warning),
    info: wrap(sonner.info, haptics.tap),
    message: wrap(sonner.message ?? sonner, haptics.tap),
    loading: (message, opts) => sonner.loading(message, opts),
    promise: sonner.promise.bind(sonner),
    dismiss: sonner.dismiss.bind(sonner),
    custom: sonner.custom?.bind(sonner),
  },
);

export { toast };
export default toast;
