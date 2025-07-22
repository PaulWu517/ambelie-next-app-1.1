'use client';

import { useState, useEffect } from 'react';
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
  period?: string;
  main_image: ImageItem | null;
  hover_image: ImageItem | null;
}

const SearchPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
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
      setProducts([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // 使用我们的搜索API接口
      const searchUrl = `/api/search?q=${encodeURIComponent(query)}`;
      
      console.log('Search URL:', searchUrl);
      
      const response = await fetch(searchUrl, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `搜索请求失败: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !Array.isArray(data.data)) {
        console.warn('Invalid search response structure');
        setProducts([]);
        return;
      }

      // 数据已经在API中转换过了，直接使用
      setProducts(data.data);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : '搜索失败，请稍后重试');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // 更新URL参数
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      performSearch(searchQuery.trim());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

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
              Found {products.length} related products
              {searchQuery && (
                <span className={styles.searchTerm}>
                  , keyword: "{searchQuery}"
                </span>
              )}
            </p>
          </div>
        )}

        {hasSearched && !loading && products.length === 0 && !error && (
          <div className={styles.noResults}>
            <p>No related products found</p>
            <p className={styles.noResultsHint}>Please try searching with other keywords</p>
          </div>
        )}

        {products.length > 0 && (
          <div className={styles.productsGrid}>
            {products.map((product) => (
              <Link 
                key={product.id} 
                href={`/products/${product.slug}`}
                className={styles.productCard}
              >
                <div className={styles.productImage}>
                  {product.main_image ? (
                    <>
                      <Image
                        src={product.main_image.url}
                        alt={product.main_image.alternativeText || product.name}
                        width={500}
                        height={667}
                        className={styles.mainImage}
                        style={{ aspectRatio: '3/4', objectFit: 'cover' }}
                      />
                      {product.hover_image && (
                        <Image
                          src={product.hover_image.url}
                          alt={product.hover_image.alternativeText || product.name}
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
        )}
      </section>
    </main>
  );
};

export default SearchPage;