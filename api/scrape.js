// File: api/scrape.js - VERSI FINAL (FIXED executablePath)

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

export default async function handler(request, response) {
    const { url: targetUrl } = request.query;

    if (!targetUrl) {
        return response.status(400).json({ error: 'Parameter "url" tidak ditemukan.' });
    }

    let browser = null;

    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            // [PERBAIKAN] Menambahkan tanda kurung () untuk memanggil fungsi
            executablePath: await chromium.executablePath(), 
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36');
        
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

        const scrapedData = await page.evaluate(() => {
            const title = document.querySelector('.headpost h1')?.textContent.trim();
            const imageElements = document.querySelectorAll('.main-reading-area img');
            const images = Array.from(imageElements).map(img => img.getAttribute('src').trim());
            return { title, images };
        });

        if (scrapedData.images.length === 0) {
            await new Promise(r => setTimeout(r, 2000));
            const updatedImages = await page.evaluate(() => {
                const imageElements = document.querySelectorAll('.main-reading-area img');
                return Array.from(imageElements).map(img => img.getAttribute('src').trim());
            });
            scrapedData.images = updatedImages;
        }

        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
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
