import React from 'react';
import styles from './ProjectDetail.module.css';

// --- TYPE DEFINITIONS ---
interface ImageFormat {
  url: string;
  width: number;
  height: number;
  size: number;
}

interface ImageItem {
  url: string;
  alternativeText?: string | null;
  formats?: {
    large?: ImageFormat;
    medium?: ImageFormat;
    small?: ImageFormat;
    xlarge?: ImageFormat;
  };
}

interface Project {
  id: number;
  name: string;
  slug: string;
  projectType: string;
  date: string;
  location?: string;
  introduction?: string | null;
  content?: string | null;
  mainImage?: ImageItem | null;
  images?: ImageItem[] | null;
}

interface StrapiResponse {
  data: Project[];
}

// --- DATA FETCHING ---
async function getProjectBySlug(slug: string): Promise<Project | null> {
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
  try {
    const res = await fetch(
      `${API_URL}/api/projects?filters[slug][$eq]=${slug}&populate=*`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      throw new Error('Failed to fetch project');
    }
    const json: StrapiResponse = await res.json();
    return json.data.length > 0 ? json.data[0] : null;
  } catch (error) {
    console.error('Error fetching project by slug:', error);
    return null;
  }
}

// --- HELPER FUNCTIONS ---
function formatDateDisplay(project: Project): string {
  if (!project.date) return '';
  
  const date = new Date(project.date);
  const formatOptions: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  return date.toLocaleDateString('en-US', formatOptions);
}

function processTextWithLineBreaks(text: string): string {
  if (!text) return '';
  return `<p>${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br />')}</p>`;
}

// --- PAGE COMPONENT ---
interface ProjectDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    return (
      <div className={styles.projectDetailContainer}>
        <div className="text-center py-20">
          <h1>Project not found</h1>
          <p>The project you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const dateDisplay = formatDateDisplay(project);

  return (
    <div className={styles.projectDetailContainer}>
      <header className={styles.projectHeader}>
        <h1 className={styles.title}>{project.name}</h1>
        <div className={styles.metaInfo}>
          <span className={styles.type}>{project.projectType}</span>
          <span className={styles.date}>{dateDisplay}</span>
          {project.location && <span className={styles.location}>{project.location}</span>}
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.textColumn}>
          {project.content ? (
            <div
              className={styles.content}
              dangerouslySetInnerHTML={{ __html: project.content }}
            />
          ) : (
            <div className={styles.noContent}>
              <p>No content available for this project.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 