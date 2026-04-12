import { BlockDefinition } from './types';

export const blockDefinitions: BlockDefinition[] = [
  {
    type: 'hero',
    label: 'Hero',
    icon: 'Layout',
    category: 'content',
    defaultProps: {
      title: 'Заголовок страницы',
      subtitle: 'Краткое описание раздела или продукта',
      buttonText: 'Начать',
      buttonUrl: '#',
      backgroundImage: '',
      overlay: true,
    },
    defaultStyles: { padding: '80px 0', textColor: '#ffffff', backgroundColor: '#1a1a2e' },
    editableFields: [
      { key: 'title', label: 'Заголовок', type: 'text' },
      { key: 'subtitle', label: 'Подзаголовок', type: 'textarea' },
      { key: 'buttonText', label: 'Текст кнопки', type: 'text' },
      { key: 'buttonUrl', label: 'Ссылка кнопки', type: 'url' },
      { key: 'backgroundImage', label: 'Фоновое изображение', type: 'image' },
      { key: 'overlay', label: 'Затемнение', type: 'boolean' },
    ],
  },
  {
    type: 'text',
    label: 'Текст',
    icon: 'Type',
    category: 'content',
    defaultProps: {
      content: '<p>Введите текст здесь...</p>',
      alignment: 'left',
    },
    defaultStyles: { padding: '24px 0' },
    editableFields: [
      { key: 'content', label: 'Содержимое', type: 'richtext' },
      { key: 'alignment', label: 'Выравнивание', type: 'select', options: [
        { label: 'Слева', value: 'left' },
        { label: 'По центру', value: 'center' },
        { label: 'Справа', value: 'right' },
      ]},
    ],
  },
  {
    type: 'image',
    label: 'Изображение',
    icon: 'Image',
    category: 'media',
    defaultProps: {
      src: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800',
      alt: 'Описание изображения',
      caption: '',
      fit: 'cover',
    },
    defaultStyles: { padding: '16px 0', borderRadius: '12px' },
    editableFields: [
      { key: 'src', label: 'Изображение', type: 'image' },
      { key: 'alt', label: 'Alt текст', type: 'text' },
      { key: 'caption', label: 'Подпись', type: 'text' },
      { key: 'fit', label: 'Масштабирование', type: 'select', options: [
        { label: 'Cover', value: 'cover' },
        { label: 'Contain', value: 'contain' },
        { label: 'Fill', value: 'fill' },
      ]},
    ],
  },
  {
    type: 'gallery',
    label: 'Галерея',
    icon: 'Grid3X3',
    category: 'media',
    defaultProps: {
      images: [
        { src: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400', alt: 'Image 1' },
        { src: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400', alt: 'Image 2' },
        { src: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400', alt: 'Image 3' },
      ],
      columns: 3,
      gap: '16px',
    },
    defaultStyles: { padding: '24px 0' },
    editableFields: [
      { key: 'images', label: 'Изображения', type: 'array' },
      { key: 'columns', label: 'Колонки', type: 'number' },
    ],
  },
  {
    type: 'button',
    label: 'Кнопка',
    icon: 'MousePointer',
    category: 'interactive',
    defaultProps: {
      text: 'Нажмите',
      url: '#',
      variant: 'primary',
      size: 'default',
      alignment: 'left',
    },
    defaultStyles: { padding: '16px 0' },
    editableFields: [
      { key: 'text', label: 'Текст', type: 'text' },
      { key: 'url', label: 'Ссылка', type: 'url' },
      { key: 'variant', label: 'Стиль', type: 'select', options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Outline', value: 'outline' },
        { label: 'Ghost', value: 'ghost' },
      ]},
      { key: 'alignment', label: 'Выравнивание', type: 'select', options: [
        { label: 'Слева', value: 'left' },
        { label: 'По центру', value: 'center' },
        { label: 'Справа', value: 'right' },
      ]},
    ],
  },
  {
    type: 'cta',
    label: 'CTA',
    icon: 'Megaphone',
    category: 'content',
    defaultProps: {
      title: 'Готовы начать?',
      description: 'Присоединяйтесь к тысячам довольных клиентов.',
      buttonText: 'Начать бесплатно',
      buttonUrl: '#',
      variant: 'filled',
    },
    defaultStyles: { padding: '64px 0', backgroundColor: '#2563eb', textColor: '#ffffff', borderRadius: '16px' },
    editableFields: [
      { key: 'title', label: 'Заголовок', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'buttonText', label: 'Текст кнопки', type: 'text' },
      { key: 'buttonUrl', label: 'Ссылка', type: 'url' },
    ],
  },
  {
    type: 'features',
    label: 'Features Grid',
    icon: 'LayoutGrid',
    category: 'content',
    defaultProps: {
      title: 'Наши возможности',
      features: [
        { icon: '🚀', title: 'Быстрый старт', description: 'Начните работу за несколько минут.' },
        { icon: '🔒', title: 'Безопасность', description: 'Ваши данные под надёжной защитой.' },
        { icon: '📊', title: 'Аналитика', description: 'Полная статистика и отчёты.' },
        { icon: '🎨', title: 'Кастомизация', description: 'Настройте под себя.' },
      ],
      columns: 2,
    },
    defaultStyles: { padding: '48px 0' },
    editableFields: [
      { key: 'title', label: 'Заголовок', type: 'text' },
      { key: 'features', label: 'Фичи', type: 'array' },
      { key: 'columns', label: 'Колонки', type: 'number' },
    ],
  },
  {
    type: 'testimonials',
    label: 'Отзывы',
    icon: 'Quote',
    category: 'content',
    defaultProps: {
      title: 'Отзывы клиентов',
      items: [
        { text: 'Отличный сервис! Рекомендую.', author: 'Иван Петров', role: 'CEO, Company', avatar: '' },
        { text: 'Удобная платформа, всё интуитивно.', author: 'Мария Иванова', role: 'Marketing Lead', avatar: '' },
      ],
    },
    defaultStyles: { padding: '48px 0' },
    editableFields: [
      { key: 'title', label: 'Заголовок', type: 'text' },
      { key: 'items', label: 'Отзывы', type: 'array' },
    ],
  },
  {
    type: 'faq',
    label: 'FAQ',
    icon: 'HelpCircle',
    category: 'content',
    defaultProps: {
      title: 'Часто задаваемые вопросы',
      items: [
        { question: 'Как начать работу?', answer: 'Зарегистрируйтесь и следуйте инструкциям.' },
        { question: 'Есть ли бесплатный период?', answer: 'Да, 14 дней бесплатно.' },
        { question: 'Как связаться с поддержкой?', answer: 'Напишите на support@example.com.' },
      ],
    },
    defaultStyles: { padding: '48px 0' },
    editableFields: [
      { key: 'title', label: 'Заголовок', type: 'text' },
      { key: 'items', label: 'Вопросы', type: 'array' },
    ],
  },
  {
    type: 'form',
    label: 'Форма',
    icon: 'FileText',
    category: 'interactive',
    defaultProps: {
      title: 'Свяжитесь с нами',
      fields: [
        { name: 'name', label: 'Имя', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'message', label: 'Сообщение', type: 'textarea', required: false },
      ],
      buttonText: 'Отправить',
    },
    defaultStyles: { padding: '48px 0' },
    editableFields: [
      { key: 'title', label: 'Заголовок', type: 'text' },
      { key: 'fields', label: 'Поля формы', type: 'array' },
      { key: 'buttonText', label: 'Текст кнопки', type: 'text' },
    ],
  },
  {
    type: 'video',
    label: 'Видео',
    icon: 'Play',
    category: 'media',
    defaultProps: {
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      title: 'Видео',
      aspectRatio: '16/9',
    },
    defaultStyles: { padding: '24px 0', borderRadius: '12px' },
    editableFields: [
      { key: 'url', label: 'URL видео', type: 'url' },
      { key: 'title', label: 'Заголовок', type: 'text' },
    ],
  },
  {
    type: 'html',
    label: 'HTML',
    icon: 'Code',
    category: 'advanced',
    defaultProps: {
      code: '<div style="padding:20px; background:#f5f5f5; border-radius:8px;">\n  <p>Custom HTML block</p>\n</div>',
    },
    defaultStyles: { padding: '16px 0' },
    editableFields: [
      { key: 'code', label: 'HTML код', type: 'textarea' },
    ],
  },
  {
    type: 'container',
    label: 'Контейнер',
    icon: 'Box',
    category: 'layout',
    defaultProps: {},
    defaultStyles: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
    editableFields: [],
  },
];

export const getBlockDefinition = (type: string): BlockDefinition | undefined =>
  blockDefinitions.find(b => b.type === type);

export const blockCategories = [
  { id: 'layout', label: 'Лейаут' },
  { id: 'content', label: 'Контент' },
  { id: 'media', label: 'Медиа' },
  { id: 'interactive', label: 'Интерактив' },
  { id: 'advanced', label: 'Продвинутые' },
] as const;
