'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';
import styles from './SearchPage.module.css';

interface ImageItem {
  url: string;
  alternativeText: string;
}

interface Product {
  id: number;
  slug: string;
  name: string;
  type: 'product';
  category: string;
  period: string;
  price?: number;
  mainImage?: {
    url: string;
    alternativeText?: string;
  } | null;
  hoverImage?: {
    url: string;
    alternativeText?: string;
  } | null;
}

interface Exhibition {
  id: number;
  slug: string;
  name: string;
  type: 'exhibition';
  exhibitionType: string;
  date: string;
  location?: string;
  introduction?: string;
  content?: string;
  mainImage?: {
    url: string;
    alternativeText?: string;
  } | null;
}

interface Project {
  id: number;
  slug: string;
  name: string;
  type: 'project';
  projectType: string;
  date: string;
  location?: string;
  introduction?: string;
  content?: string;
  mainImage?: {
    url: string;
    alternativeText?: string;
  } | null;
}

interface SearchResults {
  products: Product[];
  exhibitions: Exhibition[];
  projects: Project[];
  totalResults: number;
}

const SearchContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>({
    products: [],
    exhibitions: [],
    projects: [],
    totalResults: 0
  });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 从URL参数获取初始搜索查询
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [searchParams]);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({
        products: [],
        exhibitions: [],
        projects: [],
        totalResults: 0
      });
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // 使用本地API路由进行搜索，避免直接调用远程API导致的网络问题
      // 允许部分请求失败
      const responses = await Promise.allSettled([
        fetch(`/api/search?q=${encodeURIComponent(query)}`),
        fetch(`/api/search/exhibitions?q=${encodeURIComponent(query)}`),
        fetch(`/api/search/projects?q=${encodeURIComponent(query)}`)
      ]);
      
      const [productsResponse, exhibitionsResponse, projectsResponse] = responses;
      
      let productsData = { data: [] };
      let exhibitionsData = { data: [] };
      let projectsData = { data: [] };

      // 处理产品结果
      if (productsResponse.status === 'fulfilled' && productsResponse.value.ok) {
        try {
          productsData = await productsResponse.value.json();
        } catch (e) {
          console.error('Error parsing products JSON:', e);
        }
      }

      // 处理展览结果
      if (exhibitionsResponse.status === 'fulfilled' && exhibitionsResponse.value.ok) {
        try {
          exhibitionsData = await exhibitionsResponse.value.json();
        } catch (e) {
          console.error('Error parsing exhibitions JSON:', e);
        }
      }

      // 处理项目结果
      if (projectsResponse.status === 'fulfilled' && projectsResponse.value.ok) {
        try {
          projectsData = await projectsResponse.value.json();
        } catch (e) {
          console.error('Error parsing projects JSON:', e);
        }
      }

      // 只有当所有请求都失败时才抛出错误
      const allFailed = responses.every(
        res => res.status === 'rejected' || (res.status === 'fulfilled' && !res.value.ok)
      );

      if (allFailed) {
        throw new Error('搜索服务暂时不可用');
      }
      
      const results: SearchResults = {
        products: productsData.data || [],
        exhibitions: exhibitionsData.data || [],
        projects: projectsData.data || [],
        totalResults: (productsData.data?.length || 0) + (exhibitionsData.data?.length || 0) + (projectsData.data?.length || 0)
      };
      
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : '搜索失败，请稍后重试');
      // 如果发生严重错误，保留之前的搜索结果或者清空，这里选择清空以明确错误状态
      setSearchResults({
        products: [],
        exhibitions: [],
        projects: [],
        totalResults: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // 更新URL参数
      const newUrl = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      router.push(newUrl);
      
      // 执行搜索
      performSearch(searchQuery.trim());
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleKeywordClick = (keyword: string) => {
    setSearchQuery(keyword);
    // 更新URL参数
    const newUrl = `/search?q=${encodeURIComponent(keyword)}`;
    router.push(newUrl);
    
    // 执行搜索
    performSearch(keyword);
  };

  const quickKeywords = [
    "Chinoiserie", 
    "Coromandel", 
    "Lacquer", 
    "Mother-of-Pearl Inlaid", 
    "Byōbu",
    "Pietra Dura", 
    "Art Deco"
  ];

  return (
    <main className={styles.container}>
      {/* Search Header */}
      <header className={styles.searchHeader}>
        <h1 className={styles.pageTitle}>Search Products</h1>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchInputContainer}>
            <input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              placeholder="Enter product name to search..."
              className={styles.searchInput}
              autoFocus
            />
            <button type="submit" className={styles.searchButton}>
              <Search size={20} />
            </button>
          </div>
          
          {/* 快捷搜索关键词 */}
          <div className={styles.quickKeywordsContainer}>
            <div className={styles.quickKeywordsList}>
              {quickKeywords.map((keyword, index) => (
                <button 
                  key={index}
                  type="button"
                  className={styles.keywordButton}
                  onClick={() => handleKeywordClick(keyword)}
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>
        </form>
      </header>

      {/* Search Results */}
      <section className={styles.resultsSection}>
        {loading && (
          <div className={styles.loading}>
            <p>Searching...</p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        {hasSearched && !loading && !error && (
          <div className={styles.resultsHeader}>
            <p className={styles.resultsCount}>
              Found {searchResults.totalResults} results
              {searchQuery && (
                <span className={styles.searchTerm}>
                  , keyword: "{searchQuery}"
                </span>
              )}
            </p>
          </div>
        )}

        {hasSearched && !loading && searchResults.totalResults === 0 && !error && (
          <div className={styles.noResults}>
            <p>No results found</p>
            <p className={styles.noResultsHint}>Please try searching with other keywords</p>
          </div>
        )}

        {searchResults.products.length > 0 && (
          <div>
            <h2 className={styles.sectionTitle}>Products ({searchResults.products.length})</h2>
            <div className={styles.productsGrid}>
              {searchResults.products.map((product) => (
                <Link 
                  key={product.id} 
                  href={`/products/${product.slug}`}
                  className={styles.productCard}
                >
                  <div className={styles.productImage}>
                    {product.mainImage ? (
                       <>
                         <Image
                           src={product.mainImage.url}
                           alt={product.mainImage.alternativeText || product.name}
                           width={500}
                           height={667}
                           className={styles.mainImage}
                           style={{ aspectRatio: '3/4', objectFit: 'cover' }}
                         />
                         {product.hoverImage && (
                           <Image
                             src={product.hoverImage.url}
                             alt={product.hoverImage.alternativeText || product.name}
                             width={500}
                             height={667}
                             className={styles.hoverImage}
                             style={{ aspectRatio: '3/4', objectFit: 'cover' }}
                           />
                         )}
                       </>
                    ) : (
                      <div className={styles.noImage}>
                        <p>No Image</p>
                      </div>
                    )}
                  </div>
                  <div className={styles.productInfo}>
                    <h3 className={styles.productName}>{product.name}</h3>
                    {product.period && (
                      <p className={styles.productPeriod}>{product.period}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {searchResults.exhibitions.length > 0 && (
          <div>
            <h2 className={styles.sectionTitle}>Exhibitions ({searchResults.exhibitions.length})</h2>
            <div className={styles.resultsGrid}>
              {searchResults.exhibitions.map((exhibition) => (
                <Link 
                  key={exhibition.id} 
                  href={`/exhibitions/${exhibition.slug}`}
                  className={styles.resultCard}
                >
                  <div className={styles.resultImage}>
                    {exhibition.mainImage ? (
                       <Image
                         src={exhibition.mainImage.url}
                         alt={exhibition.mainImage.alternativeText || exhibition.name}
                         width={400}
                         height={300}
                         className={styles.image}
                         style={{ aspectRatio: '4/3', objectFit: 'cover' }}
                       />
                    ) : (
                      <div className={styles.noImage}>
                        <p>No Image</p>
                      </div>
                    )}
                  </div>
                  <div className={styles.resultInfo}>
                     <h3 className={styles.resultName}>{exhibition.name}</h3>
                     <p className={styles.resultType}>{exhibition.exhibitionType}</p>
                     <p className={styles.resultDate}>{formatDate(exhibition.date)}</p>
                     {exhibition.location && (
                       <p className={styles.resultLocation}>{exhibition.location}</p>
                     )}
                   </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {searchResults.projects.length > 0 && (
          <div>
            <h2 className={styles.sectionTitle}>Projects ({searchResults.projects.length})</h2>
            <div className={styles.resultsGrid}>
              {searchResults.projects.map((project) => (
                <Link 
                  key={project.id} 
                  href={`/projects/${project.slug}`}
                  className={styles.resultCard}
                >
                  <div className={styles.resultImage}>
                    {project.mainImage ? (
                       <Image
                         src={project.mainImage.url}
                         alt={project.mainImage.alternativeText || project.name}
                         width={400}
                         height={300}
                         className={styles.image}
                         style={{ aspectRatio: '4/3', objectFit: 'cover' }}
                       />
                    ) : (
                      <div className={styles.noImage}>
                        <p>No Image</p>
                      </div>
                    )}
                  </div>
                  <div className={styles.resultInfo}>
                     <h3 className={styles.resultName}>{project.name}</h3>
                     <p className={styles.resultType}>{project.projectType}</p>
                     <p className={styles.resultDate}>{formatDate(project.date)}</p>
                     {project.location && (
                       <p className={styles.resultLocation}>{project.location}</p>
                     )}
                   </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

// 主要导出组件，使用 Suspense 包装
const SearchPage = () => {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading search page...
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
};

export default SearchPage;