"use client";

import { LiveOrder } from "./OrderContext";
import { formatCurrency } from "./utils";

interface ReceiptWaybillProps {
    order: LiveOrder;
    restaurantName: string;
    restaurantNif?: string;
    restaurantAddress?: string;
    iud?: string;         // IUD E-Fatura (45 chars) — preenchido após emissão
    numeroDoc?: string;   // Número do documento (ex: "GT 2026/00000001")
}

export function openWaybillWindow(props: ReceiptWaybillProps) {
    const { order, restaurantName, restaurantNif, restaurantAddress, iud, numeroDoc } = props;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const shortId = order.orderNumber || order.id.split('_')[2] || "000";
    const dateStr = new Date().toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-PT">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Guia de Transporte - ${shortId}</title>
            <style>
                @page { margin: 0; size: 80mm auto; }
                body { 
                    font-family: 'Courier New', Courier, monospace; 
                    font-size: 12px; 
                    line-height: 1.4;
                    margin: 0; 
                    padding: 10px;
                    width: 80mm;
                    color: #000;
                    margin-left: auto;
                    margin-right: auto;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .text-lg { font-size: 14px; }
                .text-xl { font-size: 16px; font-weight: 900; }
                .divider { border-top: 1px dashed #000; margin: 8px 0; }
                .dashed-divider { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
                .header-title { font-size: 18px; font-weight: 900; text-transform: uppercase; margin-bottom: 5px;}
                .uppercase { text-transform: uppercase; }
                .alert-box { border: 2px solid #000; padding: 5px; text-align: center; margin: 10px 0; font-weight: bold;}
            </style>
        </head>
        <body>
            <div class="text-center">
                <div class="header-title">${restaurantName}</div>
                ${restaurantAddress ? `<div>${restaurantAddress}</div>` : ''}
                ${restaurantNif ? `<div>NIF: ${restaurantNif}</div>` : ''}
                <div class="divider"></div>
                <div class="text-xl">GUIA DE TRANSPORTE</div>
                <div class="text-xs">(Documento de Acompanhamento de Carga)</div>
                <div class="divider"></div>
            </div>

            <div>
                <div><span class="font-bold">Data/Hora Emissão:</span> ${dateStr}</div>
                <div><span class="font-bold">Pedido Ref:</span> #${shortId}</div>
                <div><span class="font-bold">Volume Total:</span> ${order.items.reduce((acc, curr) => acc + curr.quantity, 0)} Unidades</div>
            </div>

            <div class="divider"></div>
            <div class="font-bold text-center uppercase mb-1">Dados de Carga</div>
            <div class="dashed-divider"></div>

            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="width: 15%; text-align: left;">Qtd</th>
                        <th style="width: 85%; text-align: left;">Descrição da Mercadoria</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td style="vertical-align: top;">${item.quantity}</td>
                            <td>${item.name}</td>
                        </tr>
                    `).join('')}
                    <tr>
                        <td style="vertical-align: top;">1</td>
                        <td>Insumos Embalagem / Delivery</td>
                    </tr>
                </tbody>
            </table>

            <div class="divider"></div>
            <div class="font-bold text-center uppercase mb-1">Destinatário</div>
            <div class="dashed-divider"></div>
            <div>
                <div class="font-bold text-lg">${order.customerName || 'Consumidor Final'}</div>
                ${order.customerNif ? `<div><span class="font-bold">NIF / Contribuinte:</span> ${order.customerNif}</div>` : ''}
                <div>Local de Descarga:</div>
                <div class="font-bold">${order.deliveryAddress || 'Endereço não informado'}</div>
                ${order.customerPhone ? `<div>Telefone: ${order.customerPhone}</div>` : ''}
            </div>

            <div class="alert-box">
                ARTIGO ABRANGIDO PELO REGIME DE BENS EM CIRCULAÇÃO (DNRE / E-FATURA)
            </div>

            ${iud ? `
            <div class="divider"></div>
            <div style="font-size: 9px; word-break: break-all;">
                ${numeroDoc ? `<div><span class="font-bold">Doc. Fiscal:</span> ${numeroDoc}</div>` : ''}
                <div><span class="font-bold">IUD:</span> ${iud}</div>
            </div>
            ` : ''}

            <div class="text-center" style="margin-top: 15px; font-size: 10px;">
                <p>Processado por programa certificado.</p>
                <p>Dineo SaaS Fiscal</p>
                <div style="margin-top: 10px;">
                    Assinatura / Visto Motorista:
                    <br><br>
                    ____________________________________
                </div>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
}
