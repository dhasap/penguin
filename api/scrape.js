// File: api/scrape.js - VERSI PERBAIKAN UNTUK ERROR 500 (TIMEOUT)

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

export default async function handler(request, response) {
    // Bagian CORS tetap sama
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }
    
    const { url: targetUrl } = request.query;

    if (!targetUrl) {
        return response.status(400).json({ error: 'Parameter "url" tidak ditemukan.' });
    }

    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36');
        
        // =================================================================
        // ||             >>> PERBAIKAN TIMEOUT DI SINI <<<               ||
        // =================================================================
        // 1. Ganti 'networkidle0' menjadi 'domcontentloaded' agar lebih cepat.
        // 2. Naikkan timeout menjadi 40 detik (Vercel max 45 detik).
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });

        // 3. Beri jeda manual 2 detik untuk memberi waktu pada JavaScript
        //    di halaman Komikcast untuk memuat gambar-gambar (lazy loading).
        await new Promise(r => setTimeout(r, 2000));
        // =================================================================

        const scrapedData = await page.evaluate(() => {
            const title = document.querySelector('.headpost h1')?.textContent.trim();
            const imageElements = document.querySelectorAll('.main-reading-area img');
            const images = Array.from(imageElements).map(img => img.getAttribute('src').trim());
            return { title, images };
        });

        response.setHeader('Cache-Control', 's-maxage=86400');
        return response.status(200).json(scrapedData);

    } catch (error) {
        console.error(error);
        return response.status(500).json({ 
            error: `Gagal melakukan scraping.`, 
            details: error.message 
        });
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
}
