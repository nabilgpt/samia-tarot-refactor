// Mock data for the SAMIA TAROT app

export const mockServices = [
  {
    id: '1',
    title: 'قراءة التاروت الشاملة',
    titleEn: 'Comprehensive Tarot Reading',
    description: 'قراءة شاملة لحياتك العاطفية والمهنية والصحية',
    descriptionEn: 'Comprehensive reading for your love, career, and health life',
    category: 'tarot',
    duration: 30,
    price: 150,
    currency: 'SAR',
    image: '/images/tarot-comprehensive.jpg',
    rating: 4.8,
    reviewCount: 245,
    features: ['قراءة شاملة', 'تسجيل صوتي', 'تقرير مكتوب'],
    featuresEn: ['Comprehensive reading', 'Audio recording', 'Written report']
  },
  {
    id: '2',
    title: 'قراءة الحب والعلاقات',
    titleEn: 'Love & Relationships Reading',
    description: 'اكتشف مستقبل علاقاتك العاطفية',
    descriptionEn: 'Discover the future of your romantic relationships',
    category: 'tarot',
    duration: 20,
    price: 100,
    currency: 'SAR',
    image: '/images/love-reading.jpg',
    rating: 4.9,
    reviewCount: 189,
    features: ['قراءة متخصصة', 'نصائح عملية'],
    featuresEn: ['Specialized reading', 'Practical advice']
  },
  {
    id: '3',
    title: 'خريطة الأبراج الشخصية',
    titleEn: 'Personal Astrology Chart',
    description: 'تحليل شامل لخريطة الأبراج الخاصة بك',
    descriptionEn: 'Comprehensive analysis of your personal astrology chart',
    category: 'astrology',
    duration: 45,
    price: 200,
    currency: 'SAR',
    image: '/images/astrology-chart.jpg',
    rating: 4.7,
    reviewCount: 156,
    features: ['خريطة مفصلة', 'تحليل شخصي', 'توقعات سنوية'],
    featuresEn: ['Detailed chart', 'Personal analysis', 'Annual predictions']
  },
  {
    id: '4',
    title: 'قراءة الأرقام الشخصية',
    titleEn: 'Personal Numerology Reading',
    description: 'اكتشف أسرار الأرقام في حياتك',
    descriptionEn: 'Discover the secrets of numbers in your life',
    category: 'numerology',
    duration: 25,
    price: 120,
    currency: 'SAR',
    image: '/images/numerology.jpg',
    rating: 4.6,
    reviewCount: 98,
    features: ['تحليل الأرقام', 'رقم الحظ', 'توافق الأرقام'],
    featuresEn: ['Number analysis', 'Lucky number', 'Number compatibility']
  }
];

export const mockReaders = [
  {
    id: '1',
    name: 'سامية النجار',
    nameEn: 'Samia Al-Najjar',
    title: 'خبيرة التاروت والأبراج',
    titleEn: 'Tarot & Astrology Expert',
    bio: 'خبيرة في قراءة التاروت والأبراج مع أكثر من 15 عام من الخبرة',
    bioEn: 'Expert in tarot and astrology reading with over 15 years of experience',
    avatar: '/images/reader-samia.jpg',
    rating: 4.9,
    reviewCount: 1250,
    experience: 15,
    specialties: ['التاروت', 'الأبراج', 'الأحلام'],
    specialtiesEn: ['Tarot', 'Astrology', 'Dreams'],
    languages: ['العربية', 'English'],
    isOnline: true,
    pricePerMinute: 8,
    currency: 'SAR',
    totalSessions: 3500,
    responseTime: '< 5 دقائق'
  },
  {
    id: '2',
    name: 'نورا الحكيم',
    nameEn: 'Nora Al-Hakim',
    title: 'متخصصة في علم الأرقام',
    titleEn: 'Numerology Specialist',
    bio: 'متخصصة في علم الأرقام والطاقة الروحية',
    bioEn: 'Specialist in numerology and spiritual energy',
    avatar: '/images/reader-nora.jpg',
    rating: 4.8,
    reviewCount: 890,
    experience: 12,
    specialties: ['علم الأرقام', 'الطاقة', 'التأمل'],
    specialtiesEn: ['Numerology', 'Energy', 'Meditation'],
    languages: ['العربية'],
    isOnline: false,
    pricePerMinute: 6,
    currency: 'SAR',
    totalSessions: 2100,
    responseTime: '< 10 دقائق'
  },
  {
    id: '3',
    name: 'أحمد الروحاني',
    nameEn: 'Ahmed Al-Rouhani',
    title: 'خبير قراءة الكف والأحجار',
    titleEn: 'Palm Reading & Crystal Expert',
    bio: 'خبير في قراءة الكف والعلاج بالأحجار الكريمة',
    bioEn: 'Expert in palm reading and crystal healing',
    avatar: '/images/reader-ahmed.jpg',
    rating: 4.7,
    reviewCount: 567,
    experience: 10,
    specialties: ['قراءة الكف', 'الأحجار الكريمة', 'العلاج الروحي'],
    specialtiesEn: ['Palm Reading', 'Crystals', 'Spiritual Healing'],
    languages: ['العربية', 'English', 'Français'],
    isOnline: true,
    pricePerMinute: 7,
    currency: 'SAR',
    totalSessions: 1800,
    responseTime: '< 3 دقائق'
  }
];

export const mockTestimonials = [
  {
    id: '1',
    name: 'فاطمة أحمد',
    nameEn: 'Fatima Ahmed',
    rating: 5,
    comment: 'قراءة رائعة ودقيقة جداً، ساعدتني في فهم حياتي بشكل أفضل',
    commentEn: 'Amazing and very accurate reading, helped me understand my life better',
    service: 'قراءة التاروت الشاملة',
    date: '2024-01-15',
    avatar: '/images/user-fatima.jpg'
  },
  {
    id: '2',
    name: 'محمد السعيد',
    nameEn: 'Mohammed Al-Saeed',
    rating: 5,
    comment: 'خدمة ممتازة وقارئة محترفة، أنصح بها بشدة',
    commentEn: 'Excellent service and professional reader, highly recommend',
    service: 'قراءة الحب والعلاقات',
    date: '2024-01-10',
    avatar: '/images/user-mohammed.jpg'
  },
  {
    id: '3',
    name: 'نور الهدى',
    nameEn: 'Nour Al-Huda',
    rating: 4,
    comment: 'تجربة جميلة ومفيدة، التوقعات كانت دقيقة',
    commentEn: 'Beautiful and useful experience, predictions were accurate',
    service: 'خريطة الأبراج الشخصية',
    date: '2024-01-08',
    avatar: '/images/user-nour.jpg'
  }
];

export const mockCategories = [
  {
    id: 'tarot',
    name: 'قراءة التاروت',
    nameEn: 'Tarot Reading',
    description: 'اكتشف مستقبلك من خلال أوراق التاروت',
    descriptionEn: 'Discover your future through tarot cards',
    icon: '🔮',
    color: 'cosmic',
    serviceCount: 12
  },
  {
    id: 'astrology',
    name: 'علم التنجيم',
    nameEn: 'Astrology',
    description: 'تحليل شامل لخريطة الأبراج',
    descriptionEn: 'Comprehensive astrology chart analysis',
    icon: '⭐',
    color: 'gold',
    serviceCount: 8
  },
  {
    id: 'numerology',
    name: 'علم الأرقام',
    nameEn: 'Numerology',
    description: 'اكتشف أسرار الأرقام في حياتك',
    descriptionEn: 'Discover the secrets of numbers in your life',
    icon: '🔢',
    color: 'cosmic',
    serviceCount: 6
  },
  {
    id: 'palmistry',
    name: 'قراءة الكف',
    nameEn: 'Palm Reading',
    description: 'قراءة خطوط اليد والمستقبل',
    descriptionEn: 'Reading palm lines and future',
    icon: '✋',
    color: 'gold',
    serviceCount: 4
  },
  {
    id: 'crystals',
    name: 'العلاج بالكريستال',
    nameEn: 'Crystal Healing',
    description: 'العلاج والطاقة بالأحجار الكريمة',
    descriptionEn: 'Healing and energy with crystals',
    icon: '💎',
    color: 'cosmic',
    serviceCount: 5
  }
];

export const mockBookings = [
  {
    id: '1',
    serviceId: '1',
    readerId: '1',
    date: '2024-01-20',
    time: '14:00',
    duration: 30,
    status: 'confirmed',
    price: 150,
    currency: 'SAR',
    paymentStatus: 'paid',
    notes: 'أريد التركيز على الحياة المهنية'
  },
  {
    id: '2',
    serviceId: '2',
    readerId: '1',
    date: '2024-01-18',
    time: '16:30',
    duration: 20,
    status: 'completed',
    price: 100,
    currency: 'SAR',
    paymentStatus: 'paid',
    notes: 'استشارة حول العلاقة العاطفية'
  }
];

export const mockTransactions = [
  {
    id: '1',
    type: 'deposit',
    amount: 200,
    currency: 'SAR',
    date: '2024-01-15',
    status: 'completed',
    description: 'إيداع رصيد',
    method: 'credit_card'
  },
  {
    id: '2',
    type: 'payment',
    amount: -150,
    currency: 'SAR',
    date: '2024-01-20',
    status: 'completed',
    description: 'دفع مقابل قراءة التاروت الشاملة',
    method: 'wallet'
  },
  {
    id: '3',
    type: 'payment',
    amount: -100,
    currency: 'SAR',
    date: '2024-01-18',
    status: 'completed',
    description: 'دفع مقابل قراءة الحب والعلاقات',
    method: 'wallet'
  }
];

export const mockMessages = [
  {
    id: '1',
    senderId: '1',
    receiverId: 'current_user',
    message: 'مرحباً، أتطلع لجلستنا القادمة',
    timestamp: '2024-01-20T10:30:00Z',
    read: true
  },
  {
    id: '2',
    senderId: 'current_user',
    receiverId: '1',
    message: 'شكراً لك، أنا متحمس أيضاً',
    timestamp: '2024-01-20T10:35:00Z',
    read: true
  },
  {
    id: '3',
    senderId: '1',
    receiverId: 'current_user',
    message: 'هل لديك أي أسئلة محددة تريد التركيز عليها؟',
    timestamp: '2024-01-20T10:40:00Z',
    read: false
  }
]; 