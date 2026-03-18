"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface OrderItem {
    name: string;
    quantity: number;
    price: number;
}

interface OrderReceiptPDFProps {
    orderId: string;
    items: OrderItem[];
    subtotal: number;
    totalAmount: number;
    tip?: number;
    deliveryFee?: number;
    restaurantName: string;
    createdAt: string;
}

export function OrderReceiptPDF({
    orderId,
    items,
    subtotal,
    totalAmount,
    tip,
    deliveryFee,
    restaurantName,
    createdAt
}: OrderReceiptPDFProps) {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const generatePDF = async () => {
        if (!receiptRef.current) return;
        setIsGenerating(true);

        try {
            // Un-hide the component temporarily for canvas capture
            receiptRef.current.style.display = 'block';

            const canvas = await html2canvas(receiptRef.current, {
                scale: 2, // Better quality
                useCORS: true,
                backgroundColor: "#ffffff"
            });

            receiptRef.current.style.display = 'none'; // Hide again

            const imgData = canvas.toDataURL("image/png");
            
            // Typical thermal receipt width is around 80mm
            // Let's use A6 or a custom small portrait size for mobile sharing
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: [80, 200] // Thermal receipt style width
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Recibo_TapTable_${orderId}.pdf`);

        } catch (error) {
            console.error("Error generating PDF", error);
            alert("Ocorreu um erro ao gerar o recibo. Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <button
                onClick={generatePDF}
                disabled={isGenerating}
                className="w-full bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 mb-4 mt-2"
            >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {isGenerating ? "A Gerar Recibo..." : "Descarregar Recibo em PDF"}
            </button>

            {/* Hidden Receipt Template */}
            <div 
                ref={receiptRef} 
                style={{ 
                    display: 'none', 
                    width: '300px', // Fixed width for consistent capture 
                    padding: '24px',
                    backgroundColor: 'white',
                    color: 'black',
                    fontFamily: 'monospace'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 5px 0' }}>{restaurantName}</h2>
                    <p style={{ fontSize: '10px', color: '#666', margin: 0 }}>Gerado por TapTable</p>
                    <p style={{ fontSize: '12px', margin: '10px 0' }}>Pedido #{orderId.substring(0, 8)}</p>
                    <p style={{ fontSize: '10px', margin: '0' }}>{new Date(createdAt).toLocaleString('pt-PT')}</p>
                </div>

                <div style={{ borderBottom: '1px dashed #ccc', marginBottom: '15px' }} />

                <div style={{ marginBottom: '15px' }}>
                    {items.map((item, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                            <div style={{ flex: 1, paddingRight: '10px' }}>
                                {item.quantity}x {item.name}
                            </div>
                            <div style={{ fontWeight: 'bold' }}>
                                {formatCurrency(item.price * item.quantity)}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ borderBottom: '1px dashed #ccc', marginBottom: '15px' }} />

                <div style={{ fontSize: '12px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span>Subtotal:</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {tip && tip > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span>Gorjeta:</span>
                            <span>{formatCurrency(tip)}</span>
                        </div>
                    )}
                    {deliveryFee !== undefined && deliveryFee > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span>Taxa de Entrega:</span>
                            <span>{formatCurrency(deliveryFee)}</span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', borderTop: '2px solid #000', paddingTop: '10px', marginTop: '10px' }}>
                    <span>TOTAL:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                </div>

                <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '10px', color: '#666' }}>
                    Obrigado pela preferência!<br/>
                    Volte sempre.
                </div>
            </div>
        </>
    );
}
