import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { useUI } from '../context/UIContext';

const Footer = () => {
  const { t } = useTranslation();
  const { language } = useUI();

  const quickLinks = [
    { key: 'home', path: '/', label: t('nav.home') },
    { key: 'services', path: '/services', label: t('nav.services') },
    { key: 'readers', path: '/readers', label: t('nav.readers') },
    { key: 'about', path: '/about', label: t('nav.about') }
  ];

  const serviceLinks = [
    { key: 'tarot', path: '/services?category=tarot', label: t('services.categories.tarot') },
    { key: 'astrology', path: '/services?category=astrology', label: t('services.categories.astrology') },
    { key: 'numerology', path: '/services?category=numerology', label: t('services.categories.numerology') },
    { key: 'palmistry', path: '/services?category=palmistry', label: t('services.categories.palmistry') }
  ];

  const supportLinks = [
    { key: 'contact', path: '/contact', label: t('footer.contact') },
    { key: 'help', path: '/help', label: 'مساعدة' },
    { key: 'faq', path: '/faq', label: 'الأسئلة الشائعة' },
    { key: 'support', path: '/support', label: t('footer.support') }
  ];

  const legalLinks = [
    { key: 'privacy', path: '/privacy', label: t('footer.privacy') },
    { key: 'terms', path: '/terms', label: t('footer.terms') },
    { key: 'cookies', path: '/cookies', label: 'سياسة الكوكيز' }
  ];

  const socialLinks = [
    { key: 'facebook', href: '#', icon: Facebook, label: 'Facebook' },
    { key: 'twitter', href: '#', icon: Twitter, label: 'Twitter' },
    { key: 'instagram', href: '#', icon: Instagram, label: 'Instagram' },
    { key: 'youtube', href: '#', icon: Youtube, label: 'YouTube' }
  ];

  return (
    <footer className="bg-dark-900 border-t border-gold-400/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <div className="w-10 h-10 bg-gold-gradient rounded-lg flex items-center justify-center">
                <span className="text-dark-900 font-bold text-xl">س</span>
              </div>
              <h3 className="text-xl font-bold gradient-text">
                {language === 'ar' ? 'سامية تاروت' : 'SAMIA TAROT'}
              </h3>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t('footer.description')}
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-400">
                <Mail className="w-4 h-4 text-gold-400" />
                <span>info@samia-tarot.com</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-400">
                <Phone className="w-4 h-4 text-gold-400" />
                <span>+966 50 123 4567</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-400">
                <MapPin className="w-4 h-4 text-gold-400" />
                <span>الرياض، المملكة العربية السعودية</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gold-400">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.path}
                    className="text-gray-400 hover:text-gold-400 transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gold-400">{t('footer.services')}</h4>
            <ul className="space-y-2">
              {serviceLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.path}
                    className="text-gray-400 hover:text-gold-400 transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support & Legal */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gold-400">{t('footer.support')}</h4>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.path}
                    className="text-gray-400 hover:text-gold-400 transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            
            <h5 className="text-md font-semibold text-gold-400 pt-4">{t('footer.legal')}</h5>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.path}
                    className="text-gray-400 hover:text-gold-400 transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-gold-400/20">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Social Links */}
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <span className="text-sm text-gray-400">{t('footer.followUs')}:</span>
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.key}
                    href={social.href}
                    className="p-2 text-gray-400 hover:text-gold-400 hover:bg-gold-400/10 rounded-lg transition-all duration-200"
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>

            {/* Copyright */}
            <div className="text-sm text-gray-400 text-center md:text-right rtl:md:text-left">
              <p>
                © 2024 {language === 'ar' ? 'سامية تاروت' : 'SAMIA TAROT'}. {t('footer.allRightsReserved')}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 