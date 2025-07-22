'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: any;
}

const ApiTestPage = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const results: TestResult[] = [];
    
    // 测试环境变量
    results.push({
      name: '环境变量检查',
      status: 'success',
      message: '环境变量已读取',
      details: {
        NEXT_PUBLIC_STRAPI_API_URL: process.env.NEXT_PUBLIC_STRAPI_API_URL || 'undefined',
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'undefined',
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'undefined',
        NODE_ENV: process.env.NODE_ENV || 'undefined'
      }
    });
    setTestResults([...results]);
    
    // 确定API URL
    const apiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 
                   process.env.NEXT_PUBLIC_API_URL || 
                   'https://ambelie-backend-production.up.railway.app';
    
    results.push({
      name: 'API URL 配置',
      status: 'success',
      message: `使用API URL: ${apiUrl}`,
      details: { apiUrl }
    });
    setTestResults([...results]);
    
    // 测试健康检查
    try {
      const healthResponse = await fetch(`${apiUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.text();
        results.push({
          name: '健康检查',
          status: 'success',
          message: '后端服务正常',
          details: {
            status: healthResponse.status,
            response: healthData
          }
        });
      } else {
        results.push({
          name: '健康检查',
          status: 'warning',
          message: `健康检查返回状态: ${healthResponse.status}`,
          details: {
            status: healthResponse.status,
            statusText: healthResponse.statusText
          }
        });
      }
    } catch (error) {
      results.push({
        name: '健康检查',
        status: 'error',
        message: '健康检查失败',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
    setTestResults([...results]);
    
    // 测试订单API
    try {
      const ordersResponse = await fetch(`${apiUrl}/api/orders?pagination[limit]=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        results.push({
          name: '订单API测试',
          status: 'success',
          message: '订单API连接成功',
          details: {
            status: ordersResponse.status,
            dataStructure: {
              hasData: !!ordersData.data,
              isArray: Array.isArray(ordersData.data),
              length: ordersData.data?.length || 0,
              meta: ordersData.meta
            }
          }
        });
      } else {
        const errorText = await ordersResponse.text();
        results.push({
          name: '订单API测试',
          status: 'error',
          message: `订单API请求失败: ${ordersResponse.status}`,
          details: {
            status: ordersResponse.status,
            statusText: ordersResponse.statusText,
            error: errorText
          }
        });
      }
    } catch (error) {
      results.push({
        name: '订单API测试',
        status: 'error',
        message: '订单API连接失败',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
    setTestResults([...results]);
    
    // 测试支付API（使用一个假的session ID）
    try {
      const testSessionId = 'cs_test_123456789';
      const sessionResponse = await fetch(`${apiUrl}/api/payments/session/${testSessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      // 这里我们期望404或其他错误，因为这是一个测试session ID
      results.push({
        name: '支付API测试',
        status: sessionResponse.status === 404 ? 'success' : 'warning',
        message: sessionResponse.status === 404 ? 
          '支付API端点存在（返回404是正常的，因为使用了测试session ID）' : 
          `支付API返回状态: ${sessionResponse.status}`,
        details: {
          status: sessionResponse.status,
          statusText: sessionResponse.statusText,
          testSessionId
        }
      });
    } catch (error) {
      results.push({
        name: '支付API测试',
        status: 'error',
        message: '支付API连接失败',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
    setTestResults([...results]);
    
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-500 animate-spin" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <main className="min-h-screen" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">API 连接测试</h1>
          
          <div className="mb-6">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  运行测试中...
                </>
              ) : (
                '开始测试'
              )}
            </button>
          </div>

          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(result.status)}
                  <h3 className="font-semibold text-gray-900">{result.name}</h3>
                </div>
                
                <p className="text-gray-700 mb-2">{result.message}</p>
                
                {result.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      查看详细信息
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>

          {testResults.length === 0 && !isRunning && (
            <div className="text-center text-gray-500 py-8">
              点击"开始测试"按钮来检查API连接状态
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default ApiTestPage;