import { LiveOrder, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from "./OrderContext";

export interface AnalyticsData {
    totalRevenue: number;
    averageTicket: number;
    totalOrders: number;
    averageServiceTimeMinutes: number;
    busiestHours: { hour: string; count: number }[];
    topItems: { id: string; name: string; quantity: number; revenue: number }[];
    ordersByOrigin: { in_store: number; delivery: number; pickup: number };
}

// Helper to generate a random date within the last 7 days
const getRandomRecentDate = () => {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 7);
    // Bias towards dinner and lunch times (e.g., 12-14, 19-22)
    const hour = Math.random() > 0.5
        ? 19 + Math.floor(Math.random() * 4) // 19-22
        : 12 + Math.floor(Math.random() * 3); // 12-14
    const minute = Math.floor(Math.random() * 60);

    now.setDate(now.getDate() - daysAgo);
    now.setHours(hour, minute, 0, 0);
    return now.toISOString();
};

const mockMenuPool = [
    { id: "item_1", name: "Spaghetti Carbonara", price: 24.50 },
    { id: "item_2", name: "Tiramisu", price: 8.00 },
    { id: "item_3", name: "San Pellegrino 750ml", price: 5.50 },
    { id: "item_4", name: "Vinho Verde", price: 12.00 },
    { id: "item_5", name: "Super Bock", price: 3.00 },
    { id: "item_6", name: "Pastel de Nata", price: 2.00 },
    { id: "item_7", name: "Arroz de Marisco", price: 18.00 },
    { id: "item_8", name: "Bife à Portuguesa", price: 13.00 },
];

export const generateMockHistoricalOrders = (count: number = 200): LiveOrder[] => {
    const orders: LiveOrder[] = [];

    for (let i = 0; i < count; i++) {
        const createdAt = getRandomRecentDate();

        // Pick 1 to 4 random items
        const numItems = 1 + Math.floor(Math.random() * 4);
        const items: OrderItem[] = [];
        let subtotal = 0;

        for (let j = 0; j < numItems; j++) {
            const randomMenuItem = mockMenuPool[Math.floor(Math.random() * mockMenuPool.length)];
            const quantity = 1 + Math.floor(Math.random() * 2);
            items.push({
                id: randomMenuItem.id,
                name: randomMenuItem.name,
                price: randomMenuItem.price,
                quantity
            });
            subtotal += randomMenuItem.price * quantity;
        }

        const tip = subtotal * 0.1;

        const randOrigin = Math.random();
        const orderType = randOrigin > 0.4 ? "in_store" : randOrigin > 0.1 ? "delivery" : "pickup";
        const deliveryFee = orderType === "delivery" ? 12.50 : 0;

        orders.push({
            id: `hist_${Date.now()}_${i}`,
            restaurantId: "rest_123",
            tableNumber: 1 + Math.floor(Math.random() * 15),
            items,
            deliveredItemIds: items.map(it => it.id),
            subtotal,
            tip: orderType === "delivery" ? 0 : tip,
            totalAmount: orderType === "delivery" ? subtotal + deliveryFee : subtotal + tip,
            status: "delivered",
            paymentMethod: Math.random() > 0.3 ? "card" : "cash",
            paymentStatus: "paid",
            orderType,
            deliveryFee,
            createdAt,
        });
    }

    return orders;
};

export const calculateAnalytics = (orders: LiveOrder[]): AnalyticsData => {
    if (orders.length === 0) {
        return {
            totalRevenue: 0,
            averageTicket: 0,
            totalOrders: 0,
            averageServiceTimeMinutes: 0,
            busiestHours: [],
            topItems: [],
            ordersByOrigin: { in_store: 0, delivery: 0, pickup: 0 }
        };
    }

    let totalRevenue = 0;
    const itemStats: Record<string, { id: string, name: string, quantity: number, revenue: number }> = {};
    const hourStats: Record<string, number> = {};
    const origins = { in_store: 0, delivery: 0, pickup: 0 };

    orders.forEach(order => {
        totalRevenue += order.totalAmount;

        // Busiest hours
        const date = new Date(order.createdAt);
        const hour = date.getHours().toString().padStart(2, '0') + ":00";
        hourStats[hour] = (hourStats[hour] || 0) + 1;

        // Origin tracking
        const type = order.orderType || "in_store";
        origins[type] = (origins[type] || 0) + 1;

        // Top items
        order.items.forEach(item => {
            if (!itemStats[item.id]) {
                itemStats[item.id] = { id: item.id, name: item.name, quantity: 0, revenue: 0 };
            }
            itemStats[item.id].quantity += item.quantity;
            itemStats[item.id].revenue += (item.price * item.quantity);
        });
    });

    const averageTicket = totalRevenue / orders.length;
    // Mocking an average service time to look realistic based on standard restaurant ops
    const averageServiceTimeMinutes = 24 + Math.floor(Math.random() * 8); // 24 to 32 mins

    const busiestHours = Object.entries(hourStats)
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const topItems = Object.values(itemStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    return {
        totalRevenue,
        averageTicket,
        totalOrders: orders.length,
        averageServiceTimeMinutes,
        busiestHours,
        topItems,
        ordersByOrigin: origins
    };
};
