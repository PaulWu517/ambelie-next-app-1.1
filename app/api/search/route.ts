import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: '搜索关键词不能为空' },
        { status: 400 }
      );
    }

    // 构建Strapi搜索查询
    const strapiUrl = new URL(`${API_URL}/api/products`);
    
    // 使用$containsi进行不区分大小写的模糊搜索
    strapiUrl.searchParams.set('filters[name][$containsi]', query.trim());
    strapiUrl.searchParams.set('populate[0]', 'main_image');
    strapiUrl.searchParams.set('populate[1]', 'hover_image');
    strapiUrl.searchParams.set('populate[2]', 'category');
    
    // 可选：添加分页参数
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '20';
    strapiUrl.searchParams.set('pagination[page]', page);
    strapiUrl.searchParams.set('pagination[pageSize]', pageSize);
    
    console.log('Search API - Strapi URL:', strapiUrl.toString());
    
    const response = await fetch(strapiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Strapi search failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: '搜索服务暂时不可用' },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    // 验证响应数据结构
    if (!data || !Array.isArray(data.data)) {
      console.error('Invalid Strapi response structure:', data);
      return NextResponse.json(
        { error: '搜索结果格式错误' },
        { status: 500 }
      );
    }

    // 转换数据格式以匹配前端期望的结构
    const transformedData = {
      data: data.data.map((product: any) => {
        try {
          return {
            id: product.id,
            slug: product.slug,
            name: product.name,
            period: product.period,
            main_image: product.main_image ? {
              url: product.main_image.url?.startsWith('http') 
                ? product.main_image.url 
                : `${API_URL}${product.main_image.url}`,
              alternativeText: product.main_image.alternativeText || '',
            } : null,
            hover_image: product.hover_image ? {
              url: product.hover_image.url?.startsWith('http') 
                ? product.hover_image.url 
                : `${API_URL}${product.hover_image.url}`,
              alternativeText: product.hover_image.alternativeText || '',
            } : null,
            category: product.category || null,
          };
        } catch (error) {
          console.error('Error transforming product:', product, error);
          return null;
        }
      }).filter(Boolean), // 过滤掉null值
      meta: data.meta || {
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          pageCount: 1,
          total: data.data?.length || 0,
        }
      }
    };

    return NextResponse.json(transformedData);
    
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: '搜索服务发生错误' },
      { status: 500 }
    );
  }
}