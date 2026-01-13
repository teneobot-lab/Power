import { InventoryItem, Supplier, User, AppSettings, TablePreferences } from './types';

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: '1',
    name: 'Wireless Ergonomic Mouse',
    sku: 'PER-001',
    category: 'Peripherals',
    quantity: 45,
    baseUnit: 'Pcs',
    alternativeUnits: [{ name: 'Box (10)', ratio: 10 }],
    minLevel: 15,
    unitPrice: 25.50,
    location: 'A-12',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Mechanical Keyboard (Blue Switch)',
    sku: 'PER-002',
    category: 'Peripherals',
    quantity: 8,
    baseUnit: 'Pcs',
    alternativeUnits: [{ name: 'Carton (5)', ratio: 5 }],
    minLevel: 10,
    unitPrice: 85.00,
    location: 'A-13',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '3',
    name: '27-inch 4K Monitor',
    sku: 'DIS-001',
    category: 'Displays',
    quantity: 12,
    baseUnit: 'Unit',
    minLevel: 5,
    unitPrice: 320.00,
    location: 'B-04',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'USB-C Hub Multiport Adapter',
    sku: 'ACC-005',
    category: 'Accessories',
    quantity: 120,
    baseUnit: 'Pcs',
    alternativeUnits: [{ name: 'Box (20)', ratio: 20 }, { name: 'Master (100)', ratio: 100 }],
    minLevel: 30,
    unitPrice: 45.99,
    location: 'C-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Laptop Stand (Aluminum)',
    sku: 'ACC-008',
    category: 'Accessories',
    quantity: 3,
    baseUnit: 'Pcs',
    minLevel: 10,
    unitPrice: 29.99,
    location: 'C-02',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '6',
    name: 'Noise Cancelling Headphones',
    sku: 'AUD-003',
    category: 'Audio',
    quantity: 25,
    baseUnit: 'Unit',
    minLevel: 8,
    unitPrice: 150.00,
    location: 'D-05',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '7',
    name: 'Webcam 1080p',
    sku: 'CAM-001',
    category: 'Peripherals',
    quantity: 18,
    baseUnit: 'Pcs',
    minLevel: 10,
    unitPrice: 55.00,
    location: 'A-14',
    lastUpdated: new Date().toISOString(),
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: '1',
    name: 'TechGlobal Distributors',
    contactPerson: 'Sarah Jenkins',
    email: 'orders@techglobal.com',
    phone: '+1 (555) 123-4567',
    address: '123 Tech Park, Silicon Valley, CA'
  },
  {
    id: '2',
    name: 'MegaByte Accessories',
    contactPerson: 'David Chen',
    email: 'david.c@megabyte.net',
    phone: '+1 (555) 987-6543',
    address: '456 Component Way, Austin, TX'
  },
  {
    id: '3',
    name: 'Display Solutions Inc.',
    contactPerson: 'Mike Ross',
    email: 'support@displaysolutions.com',
    phone: '+1 (555) 456-7890',
    address: '789 Visual Blvd, New York, NY'
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'admin@smartstock.com',
    role: 'admin',
    status: 'active',
    lastLogin: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Alice Smith',
    email: 'alice@smartstock.com',
    role: 'staff',
    status: 'active',
    lastLogin: new Date(Date.now() - 86400000).toISOString()
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  // FIX: Use relative path '/' to trigger Proxy in vite.config.ts or vercel.json
  // This avoids Mixed Content errors (HTTPS -> HTTP) and Firewall blocking
  viteGasUrl: '/', 
  youtubeApiKey: '',
  tiktokConfig: '',
  mediaItems: [
    {
      id: 'default-yt-1',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      embedId: 'jfKfPfyJRdk',
      title: 'lofi hip hop radio - beats to relax/study to',
      addedAt: new Date().toISOString()
    },
    {
      id: 'default-yt-2',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
      embedId: '5qap5aO4i9A',
      title: 'lofi hip hop radio - beats to sleep/chill to',
      addedAt: new Date().toISOString()
    },
    {
        id: 'default-tk-1',
        type: 'tiktok',
        url: 'https://www.tiktok.com/@tiktok/video/7106603221976206638', // Sample ID
        embedId: '7106603221976206638',
        title: 'Trending TikTok Sample',
        addedAt: new Date().toISOString()
    }
  ]
};

export const DEFAULT_TABLE_PREFS: TablePreferences = {
  inventory: [
    { id: 'name', label: 'Item Name', visible: true },
    { id: 'category', label: 'Category', visible: true },
    { id: 'quantity', label: 'Stock Level', visible: true },
    { id: 'price', label: 'Price', visible: true },
    { id: 'location', label: 'Location', visible: true },
  ],
  history: [
    { id: 'date', label: 'Date', visible: true },
    { id: 'name', label: 'Item Name', visible: true },
    { id: 'type', label: 'Type', visible: true },
    { id: 'qty', label: 'Quantity', visible: true },
    { id: 'total', label: 'Total Base', visible: true },
    { id: 'notes', label: 'Notes', visible: true },
  ],
  suppliers: [
    { id: 'company', label: 'Company Name', visible: true },
    { id: 'contact', label: 'Contact Person', visible: true },
    { id: 'info', label: 'Contact Info', visible: true },
    { id: 'address', label: 'Address', visible: true },
  ]
};

export const CATEGORIES = ['Peripherals', 'Displays', 'Accessories', 'Audio', 'Components', 'Cables'];