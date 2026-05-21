import { EducationAuthProvider } from '@/contexts/EducationAuthContext';
import '@/templates/EducationPortal/education.css';

export default function EducationLayout({ children }: { children: React.ReactNode }) {
  return (
    <EducationAuthProvider>
      {children}
    </EducationAuthProvider>
  );
}
