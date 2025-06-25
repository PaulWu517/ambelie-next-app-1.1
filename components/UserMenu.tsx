'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, ShoppingCart, Heart, MessageSquare, MapPin, LogOut } from 'lucide-react';
import { useCartStore } from '@/lib/stores/cartStore';

interface UserMenuProps {
  user: {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  } | null;
  onSignOut: () => void;
}

export default function UserMenu({ user, onSignOut }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cartItemCount = useCartStore((state) => state.getItemCount());

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200); // 200ms delay to allow moving mouse between button and menu
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!user) {
    return (
      <div className="user-menu">
        <Link href="/auth/login" className="login-link">
          <User className="user-icon" size={20} />
          <span className="login-text">Sign In</span>
        </Link>
      </div>
    );
  }

  const menuItems = [
    {
      label: 'Profile',
      href: '/account/profile',
      icon: User,
    },
    {
      label: 'Cart',
      href: '/cart',
      icon: ShoppingCart,
      badge: cartItemCount > 0 ? cartItemCount : undefined,
    },
    {
      label: 'Orders',
      href: '/account/orders',
      icon: MessageSquare,
    },
    {
      label: 'Wishlist',
      href: '/account/wishlist',
      icon: Heart,
    },
    {
      label: 'Inquiries',
      href: '/account/inquiries',
      icon: MessageSquare,
    },
    // {
    //   label: 'Addresses',
    //   href: '/account/addresses',
    //   icon: MapPin,
    // },
  ];

  return (
    <div 
      className="user-menu" 
      ref={menuRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`user-avatar-button ${isOpen ? 'active' : ''}`}
        aria-label="User menu"
      >
        {cartItemCount > 0 && <div className="cart-notification-dot"></div>}
        
        {user.avatar ? (
          <Image
            src={user.avatar}
            alt={`${user.firstName || user.username}'s avatar`}
            width={20}
            height={20}
            className="avatar-image-header"
          />
        ) : (
          <User size={20} className="user-icon-header" />
        )}
        <span className="user-name">
          {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username}
        </span>
      </button>

      {isOpen && (
        <div className="user-dropdown">
          <div className="user-info">
            <div className="user-avatar">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={`${user.firstName || user.username}'s avatar`}
                  width={40}
                  height={40}
                  className="avatar-image"
                />
              ) : (
                <div className="avatar-placeholder large">
                  <User size={20} />
                </div>
              )}
            </div>
            <div className="user-details">
              <p className="user-display-name">
                {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username}
              </p>
              <p className="user-email">{user.email}</p>
            </div>
          </div>

          <div className="menu-divider"></div>

          <div className="menu-items">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="menu-item"
                onClick={() => setIsOpen(false)}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
                {item.badge && <span className="menu-item-badge">{item.badge}</span>}
              </Link>
            ))}
          </div>

          <div className="menu-divider"></div>

          <button
            className="menu-item sign-out"
            onClick={() => {
              onSignOut();
              setIsOpen(false);
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
} 