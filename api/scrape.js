// File: api/scrape.js

const chrome = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

export default async function handler(request, response) {
    // 1. Dapatkan URL target dari parameter query
    const { url: targetUrl } = request.query;

    if (!targetUrl) {
        return response.status(400).json({ error: 'Parameter "url" tidak ditemukan.' });
    }

    let browser = null;

    try {
        // 2. Siapkan dan jalankan browser headless
        browser = await puppeteer.launch({
            args: chrome.args,
            executablePath: await chrome.executablePath,
            headless: chrome.headless,
        });

        const page = await browser.newPage();
        
        // Atur User-Agent agar lebih meyakinkan
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36');
        
        // 3. Buka halaman target
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // 4. Ekstrak data yang kita inginkan
        // Ini adalah logika yang sama seperti yang kita rencanakan untuk viewer.js
        const scrapedData = await page.evaluate(() => {
            const title = document.querySelector('.headpost h1')?.textContent.trim();
            const imageElements = document.querySelectorAll('.main-reading-area img');
            
            const images = Array.from(imageElements).map(img => img.getAttribute('src').trim());
            
            return { title, images };
        });

        // 5. Kirim kembali hasilnya sebagai JSON
        // Set header CORS agar frontend di InfinityFree bisa mengaksesnya
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate'); // Cache selama 60 detik
        return response.status(200).json(scrapedData);

    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: `Gagal melakukan scraping: ${error.message}` });
    } finally {
        // 6. Selalu pastikan browser ditutup
        if (browser !== null) {
            await browser.close();
        }
    }
}
