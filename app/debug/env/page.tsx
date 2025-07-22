'use client';

import React from 'react';

const EnvDebugPage = () => {
  const envVars = {
    'NEXT_PUBLIC_STRAPI_API_URL': process.env.NEXT_PUBLIC_STRAPI_API_URL,
    'NEXT_PUBLIC_API_URL': process.env.NEXT_PUBLIC_API_URL,
    'NEXT_PUBLIC_SITE_URL': process.env.NEXT_PUBLIC_SITE_URL,
    'NEXT_PUBLIC_STRAPI_API_TOKEN': process.env.NEXT_PUBLIC_STRAPI_API_TOKEN ? '已设置' : '未设置',
  };

  const getApiUrl = () => {
    return process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://ambelie-backend-production.up.railway.app';
  };

  const testApiConnection = async () => {
    const apiUrl = getApiUrl();
    try {
      const response = await fetch(`${apiUrl}/api/products?pagination[limit]=1`);
      return {
        success: response.ok,
        status: response.status,
        url: `${apiUrl}/api/products?pagination[limit]=1`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        url: `${apiUrl}/api/products?pagination[limit]=1`
      };
    }
  };

  const [apiTest, setApiTest] = React.useState<any>(null);
  const [testing, setTesting] = React.useState(false);

  const handleTestApi = async () => {
    setTesting(true);
    const result = await testApiConnection();
    setApiTest(result);
    setTesting(false);
  };

  return (
    <main className="min-h-screen bg-gray-50" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">环境变量调试</h1>
        
        {/* 环境变量状态 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">环境变量状态</h2>
          <div className="space-y-3">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-mono text-sm">{key}</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {value || '未设置'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 实际使用的API URL */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">实际使用的API URL</h2>
          <div className="p-3 bg-blue-50 rounded">
            <span className="font-mono text-sm">{getApiUrl()}</span>
          </div>
        </div>

        {/* API连接测试 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">API连接测试</h2>
          <button
            onClick={handleTestApi}
            disabled={testing}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {testing ? '测试中...' : '测试API连接'}
          </button>
          
          {apiTest && (
            <div className={`mt-4 p-4 rounded ${
              apiTest.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="space-y-2">
                <div>
                  <strong>状态:</strong> 
                  <span className={apiTest.success ? 'text-green-800' : 'text-red-800'}>
                    {apiTest.success ? '连接成功' : '连接失败'}
                  </span>
                </div>
                <div>
                  <strong>URL:</strong> 
                  <span className="font-mono text-sm">{apiTest.url}</span>
                </div>
                {apiTest.status && (
                  <div>
                    <strong>HTTP状态:</strong> {apiTest.status}
                  </div>
                )}
                {apiTest.error && (
                  <div>
                    <strong>错误:</strong> 
                    <span className="text-red-800">{apiTest.error}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 修复建议 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">修复建议</h2>
          <div className="text-yellow-700 space-y-2">
            <p>如果API连接失败，请检查以下设置：</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>确保在Vercel中设置了 <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_API_URL</code> 环境变量</li>
              <li>值应该是: <code className="bg-yellow-100 px-1 rounded">https://ambelie-backend-production.up.railway.app</code></li>
              <li>设置后需要重新部署应用</li>
              <li>确保后端服务正在运行</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
};

export default EnvDebugPage;