// File: api/scrape.js - VERSI FINAL BATTLE
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

export default async function handler(request, response) {
    const { url: targetUrl } = request.query;
    if (!targetUrl) return response.status(400).json({ error: 'Parameter "url" tidak ditemukan.' });
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
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 35000 });
        const scrapedData = await page.evaluate(() => {
            const title = document.querySelector('.headpost h1')?.textContent.trim();
            const imageElements = document.querySelectorAll('.main-reading-area img');
            const images = Array.from(imageElements).map(img => img.getAttribute('src').trim());
            return { title, images };
        });
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Cache-Control', 's-maxage=86400');
        return response.status(200).json(scrapedData);
    } catch (error) {
        return response.status(500).json({ error: `Gagal melakukan scraping.`, details: error.message });
    } finally {
        if (browser !== null) await browser.close();
    }
}
