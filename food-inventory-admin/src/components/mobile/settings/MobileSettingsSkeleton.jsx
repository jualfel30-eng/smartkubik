export default function MobileSettingsSkeleton() {
  return (
    <div className="space-y-4 px-4 py-4">
      <div className="h-32 rounded-[var(--mobile-radius-lg)] bg-muted animate-pulse" />
      <div className="h-48 rounded-[var(--mobile-radius-lg)] bg-muted animate-pulse" />
      <div className="h-24 rounded-[var(--mobile-radius-lg)] bg-muted animate-pulse" />
    </div>
  );
}
