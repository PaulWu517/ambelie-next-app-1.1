'use client';

import { useEffect } from 'react';

export default function ScrollAnimations() {
  useEffect(() => {
    // 找到所有需要动画的元素
    const animatedElements = document.querySelectorAll('.animate-on-scroll, .slide-from-left, .slide-from-right, .past-exhibitions-section .product-item, .past-exhibitions-section .product-title, .past-exhibitions-section .product-period, .past-exhibitions-section .exhibition-date, .about-hero-title, .about-hero-subtitle, .about-section-title, .about-paragraph, .about-text-content, .about-image-content');

    // 创建观察器实例
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // 元素进入视口，添加动画类
          const target = entry.target;
          
          if (target.classList.contains('delay-100')) {
            setTimeout(() => { target.classList.add('animated'); }, 50);
          } else if (target.classList.contains('delay-200')) {
            setTimeout(() => { target.classList.add('animated'); }, 100);
          } else if (target.classList.contains('delay-300')) {
            setTimeout(() => { target.classList.add('animated'); }, 150);
          } else if (target.classList.contains('delay-400')) {
            setTimeout(() => { target.classList.add('animated'); }, 200);
          } else if (target.classList.contains('delay-500')) {
            setTimeout(() => { target.classList.add('animated'); }, 250);
          } else if (target.classList.contains('delay-600')) {
            setTimeout(() => { target.classList.add('animated'); }, 300);
          } else if (target.classList.contains('delay-700')) {
            setTimeout(() => { target.classList.add('animated'); }, 350);
          } else {
            target.classList.add('animated');
          }
          
          // 一旦元素被动画过，不再观察它
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null, // 相对于视口
      rootMargin: '0px', // 无边距
      threshold: 0.15 // 当15%的元素可见时触发
    });

    // 开始观察所有标记的元素
    animatedElements.forEach(el => {
      observer.observe(el);
    });

    // 清理函数
    return () => {
      animatedElements.forEach(el => {
        observer.unobserve(el);
      });
    };
  }, []);

  return null; // 这个组件不渲染任何内容，只处理动画逻辑
} 