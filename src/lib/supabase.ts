// Mock functions for Supabase interactions during the MVP phase

export type TableStatus = "available" | "occupied" | "payment_pending";

export interface Restaurant {
    id: string;
    name: string;
    logo: string;
    defaultTipPercentage: number;
}

export interface MenuItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

export interface TableBill {
    id: string;
    restaurantId: string;
    tableNumber: number;
    items: MenuItem[];
    subtotal: number;
    status: TableStatus;
}

export interface DigitalMenuItem {
    id: string;
    categoryId: string;
    name: string;
    description: string;
    price: number;
    image: string;
    isAvailable: boolean;
}

export interface MenuCategory {
    id: string;
    name: string;
    items: DigitalMenuItem[];
}

// End of file.
