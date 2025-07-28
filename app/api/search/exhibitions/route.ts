import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || 'https://ambelie-backend-production.up.railway.app';

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
    const strapiUrl = new URL(`${API_URL}/api/exhibitions`);
    
    // 使用$or进行多字段搜索，根据exhibition schema使用正确的字段
    strapiUrl.searchParams.set('filters[$or][0][name][$containsi]', query.trim());
    strapiUrl.searchParams.set('filters[$or][1][introduction][$containsi]', query.trim());
    strapiUrl.searchParams.set('filters[$or][2][description][$containsi]', query.trim());
    strapiUrl.searchParams.set('populate', 'mainImage');
    
    // 可选：添加分页参数
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '20';
    strapiUrl.searchParams.set('pagination[page]', page);
    strapiUrl.searchParams.set('pagination[pageSize]', pageSize);
    
    console.log('Exhibitions Search API - Strapi URL:', strapiUrl.toString());
    
    const response = await fetch(strapiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Strapi exhibitions search failed:', response.status, response.statusText);
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
      data: data.data.map((exhibition: any) => {
        try {
          return {
            id: exhibition.id,
            slug: exhibition.slug,
            name: exhibition.name,
            type: 'exhibition',
            exhibitionType: exhibition.exhibitionType,
            date: exhibition.startDate, // 使用startDate作为主要日期
            startDate: exhibition.startDate,
            endDate: exhibition.endDate,
            location: exhibition.location,
            introduction: exhibition.introduction,
            description: exhibition.description,
            mainImage: exhibition.mainImage ? {
              url: exhibition.mainImage.url?.startsWith('http') 
                ? exhibition.mainImage.url 
                : `${API_URL}${exhibition.mainImage.url}`,
              alternativeText: exhibition.mainImage.alternativeText || '',
            } : null,
          };
        } catch (error) {
          console.error('Error transforming exhibition:', exhibition, error);
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
    console.error('Exhibitions Search API error:', error);
    return NextResponse.json(
      { error: '搜索服务发生错误' },
      { status: 500 }
    );
  }
}