import './education.css';
import EduNav from './components/EduNav';
import EduHero from './components/EduHero';
import EduStatsBand from './components/EduStatsBand';
import EduPrograms from './components/EduPrograms';
import EduQuote from './components/EduQuote';
import EduAbout from './components/EduAbout';
import EduAccess from './components/EduAccess';
import EduFooter from './components/EduFooter';
import type { EduPublicConfig } from './types';

interface EducationPortalProps {
  config: EduPublicConfig;
  domain: string;
}

export default function EducationPortal({ config, domain }: EducationPortalProps) {
  return (
    <>
      <EduNav config={config} domain={domain} />
      <EduHero config={config} domain={domain} />
      <EduStatsBand config={config} />
      <EduPrograms config={config} />
      <EduQuote config={config} />
      <EduAbout config={config} />
      <EduAccess config={config} domain={domain} />
      <EduFooter config={config} />
    </>
  );
}
