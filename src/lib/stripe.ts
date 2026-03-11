// Mock functions for Stripe integration

export interface PaymentIntentResponse {
    clientSecret: string;
    amount: number;
    status: "succeeded" | "requires_payment_method" | "processing";
}

export const mockStripe = {
    createPaymentIntent: async (amount: number, receiptEmail?: string): Promise<PaymentIntentResponse> => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        console.log(`[Stripe Mock] Intent created for $${amount}. Email: ${receiptEmail}`);
        return {
            clientSecret: "pi_mock_123_secret_456",
            amount,
            status: "requires_payment_method",
        };
    },

    confirmPayment: async (clientSecret: string): Promise<{ success: boolean; transactionId: string }> => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        console.log(`[Stripe Mock] Payment confirmed for ${clientSecret}`);
        return {
            success: true,
            transactionId: "txn_mock_7890",
        };
    }
};
