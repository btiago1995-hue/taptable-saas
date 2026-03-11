const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Catch console logs
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('\n❌ BROWSER ERROR:');
            console.log(msg.text());
        } else {
            console.log('Browser Log:', msg.text());
        }
    });

    page.on('pageerror', error => {
        console.log('\n🚨 PAGE CRASH:');
        console.log(error.message);
        console.log(error.stack);
    });

    await page.goto('http://localhost:3000/admin/kitchen');

    try {
        console.log('Clicking Simular Delivery...');
        await page.click('button:has-text("Simular Delivery")');
        
        await page.waitForTimeout(1000);
        
        console.log('Clicking Aceitar e Preparar...');
        // Match the first accept button
        await page.click('button:has-text("Aceitar e Preparar")');
        
        await page.waitForTimeout(2000);
        
    } catch (e) {
        console.log('Script Error:', e.message);
    }

    await browser.close();
})();
