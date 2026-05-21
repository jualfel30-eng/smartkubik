export interface EduPublicConfig {
  institutionName: string;
  logoUrl?: string;
  tagline?: string;
  primaryColor?: string;
  bannerUrl?: string;
  foundedYear?: number;
  totalStudents?: number;
  totalTeachers?: number;
  programs?: { name: string; level: string }[];
  quote?: { text: string; author: string; avatarUrl?: string };
  contactInfo?: { phone?: string; email?: string; address?: string };
  socialLinks?: Record<string, string>;
}
