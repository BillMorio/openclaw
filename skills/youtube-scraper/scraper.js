const API_KEY = process.env.APIFY_API_KEY;
const ACTOR_ID = 'streamers~youtube-channel-scraper';

if (!API_KEY) {
    console.error("Error: APIFY_API_KEY environment variable is missing.");
    process.exit(1);
}

// Get the channel handle from the command line arguments
const channelHandle = process.argv[2];

if (!channelHandle) {
    console.error("Error: Please provide a YouTube channel handle (e.g., @MrBeast)");
    process.exit(1);
}

// Ensure the handle starts with @
const formattedHandle = channelHandle.startsWith('@') ? channelHandle : `@${channelHandle}`;
const channelUrl = `https://www.youtube.com/${formattedHandle}`;

const input = {
    maxResultStreams: 0,
    maxResults: 10,
    maxResultsShorts: 0,
    sortVideosBy: "NEWEST",
    startUrls: [
        {
            url: channelUrl
        }
    ]
};

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function generateImage(channelHandle, videoData) {
    // 1. Build the HTML/CSS template
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
            
            body {
                font-family: 'Inter', sans-serif;
                background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
                color: #f8fafc;
                margin: 0;
                padding: 40px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }

            .dashboard {
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
                padding: 40px;
                width: 1000px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .title h1 {
                font-size: 32px;
                font-weight: 800;
                margin: 0 0 8px 0;
                background: linear-gradient(to right, #38bdf8, #818cf8);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .title p {
                color: #94a3b8;
                margin: 0;
                font-size: 16px;
            }

            .video-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
            }

            .video-card {
                background: rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 16px;
                padding: 24px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                transition: transform 0.2s;
            }

            .video-title {
                font-size: 18px;
                font-weight: 600;
                line-height: 1.4;
                margin-bottom: 16px;
                color: #f1f5f9;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .stats {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 14px;
            }

            .views {
                color: #38bdf8;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .views::before {
                content: '';
                display: inline-block;
                width: 8px;
                height: 8px;
                background-color: #38bdf8;
                border-radius: 50%;
                box-shadow: 0 0 10px #38bdf8;
            }

            .date {
                color: #64748b;
            }
        </style>
    </head>
    <body>
        <div class="dashboard">
            <div class="header">
                <div class="title">
                    <h1>YouTube Competitor Intel</h1>
                    <p>Spying on: <strong>${channelHandle}</strong></p>
                </div>
                <div class="title" style="text-align: right;">
                    <p>Recent Uploads</p>
                    <h1 style="font-size: 24px;">Latest 10 Videos</h1>
                </div>
            </div>
            
            <div class="video-grid">
                ${videoData.map(video => `
                    <div class="video-card">
                        <div class="video-title">${video.title}</div>
                        <div class="stats">
                            <span class="views">${video.viewCount?.toLocaleString() || 'Unknown'} views</span>
                            <span class="date">${new Date(video.date).toLocaleDateString()}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </body>
    </html>
    `;

    // 2. Launch Puppeteer and take screenshot (ensure system chromium is used on VPS)
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 }); // High-Res
    
    // Set the HTML content
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Determine output path (in the OpenClaw workspace directory to pass security sandbox)
    const os = require('os');
    const workspaceDir = path.join(os.homedir(), '.openclaw', 'workspace');
    if (!fs.existsSync(workspaceDir)) {
        fs.mkdirSync(workspaceDir, { recursive: true });
    }
    const outputPath = path.join(workspaceDir, `report_${channelHandle.replace('@', '')}.png`);
    
    // Snapshot the specific dashboard element for a clean crop
    const element = await page.$('.dashboard');
    await element.screenshot({ path: outputPath, omitBackground: true });
    
    await browser.close();
    
    return outputPath;
}

async function scrapeChannel() {
    console.log(`[Youtube Scraper] Fetching latest videos for ${formattedHandle}...`);
    const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(input)
        });
        
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText}\n${err}`);
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            // Pick the 10 most recent videos
            const recentVideos = data.slice(0, 10);
            
            console.log(`Successfully fetched data. Rendering dashboard...`);
            
            // Generate the image
            const imagePath = await generateImage(formattedHandle, recentVideos);
            
            // Provide the output to the Bot!
            console.log(`\nHere is the dashboard for ${formattedHandle}:`);
            console.log(`MEDIA:${imagePath}`);  // <--- The magic attachment command!
            console.log(`\nTop videos retrieved:`);
            recentVideos.slice(0, 3).forEach(v => console.log(`- ${v.title} (${v.viewCount?.toLocaleString()} views)`));
            
        } else {
            console.log(`No videos found for ${formattedHandle}.`);
        }
    } catch (error) {
        console.error('Failed to scrape channel:', error.message);
        process.exit(1);
    }
}

scrapeChannel();
