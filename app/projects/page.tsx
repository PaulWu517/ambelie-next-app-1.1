import Image from 'next/image';
import Link from 'next/link';
import ScrollAnimations from '../../components/ScrollAnimations';

// Define the types needed for data fetching
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

// Function to fetch all projects
async function getProjects(): Promise<Project[]> {
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';
  try {
    const res = await fetch(
      `${API_URL}/api/projects?populate=*&sort=date:desc`, 
      {
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch projects`);
    }
    const json: StrapiResponse = await res.json();
    return json.data;
  } catch (error) {
    console.error(`Error fetching projects:`, error);
    return [];
  }
}

// Helper function to format date display
function formatDateDisplay(project: Project): string {
  if (!project.date) return '';
  
  const date = new Date(project.date);
  
  const formatOptions: Intl.DateTimeFormatOptions = { 
    year: 'numeric',
    month: 'long'
  };
  
  return date.toLocaleDateString('en-US', formatOptions);
}

// Helper function to format date and location display
function formatDateLocationDisplay(project: Project): string {
  const dateStr = formatDateDisplay(project);
  const locationStr = project.location || '';
  
  if (dateStr && locationStr) {
    return `${dateStr} • ${locationStr}`;
  } else if (dateStr) {
    return dateStr;
  } else if (locationStr) {
    return locationStr;
  }
  
  return '';
}

// Helper function to get introduction text
function getIntroductionText(project: Project): string {
  // 首先尝试使用introduction字段
  if (project.introduction && project.introduction.trim()) {
    return project.introduction;
  }
  
  // 如果introduction为空，尝试从content中提取文本
  if (project.content) {
    // 移除HTML标签并截取前200个字符作为介绍
    const textContent = project.content.replace(/<[^>]*>/g, '').trim();
    if (textContent.length > 200) {
      return textContent.substring(0, 200) + '...';
    }
    return textContent;
  }
  
  return '';
}

// 元数据定义
export const metadata = {
  title: "Projects | Ambelie",
  description: "Discover Ambelie's featured design projects, collaborations, and interior design showcases featuring our curated collections.",
};

export default async function ProjectsPage() {
  const projects = await getProjects();
  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://ambelie-backend-production.up.railway.app';

  return (
    <main>
      <ScrollAnimations />
      {/* Page Title */}
      <section className="page-header">
        <h1 className="page-title">PROJECTS</h1>
      </section>

      {/* Featured Projects Section */}
      <section className="exhibitions-asymmetric store-locations">
        <div className="section-container">
          <h2 className="section-heading">FEATURED PROJECTS</h2>
        </div>
        
        {projects.length > 0 ? (
          projects.map((project, index) => (
            <div key={project.id} className={`exhibitions-row ${index % 2 === 0 ? 'first-row' : 'second-row'}`}>
              <div className="exhibition-main-image animate-on-scroll">
                <div className="exhibition-image-container">
                  {project.mainImage ? (
                    <Image 
                      src={`${API_URL}${project.mainImage.url}`} 
                      alt={project.mainImage.alternativeText || project.name}
                      width={800} 
                      height={533} 
                      style={{objectFit: 'cover'}}
                      priority={index === 0}
                      unoptimized
                    />
                  ) : (
                    <div className="placeholder-image" style={{width: 800, height: 533, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <span>No Image</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="exhibition-content animate-on-scroll delay-200">
                <div className="exhibition-text">
                  <h2 className="exhibition-title animate-on-scroll delay-300">{project.name}</h2>
                  <p className="store-address animate-on-scroll delay-400">{project.projectType}</p>
                  <p className="exhibition-date animate-on-scroll delay-500">{formatDateLocationDisplay(project)}</p>
                  {getIntroductionText(project) && (
                    <p className="exhibition-description animate-on-scroll delay-600">{getIntroductionText(project)}</p>
                  )}
                  <Link href={`/projects/${project.slug}`} className="view-more-link animate-on-scroll delay-700">
                    View Project
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-projects">
            <p>No featured projects available.</p>
          </div>
        )}
      </section>
    </main>
  );
} 