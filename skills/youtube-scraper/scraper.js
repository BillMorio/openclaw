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
            console.log(`\nFound ${data.length} recent videos for ${formattedHandle}:\n`);
            data.forEach((video, index) => {
                console.log(`${index + 1}. Title: ${video.title}`);
                console.log(`   URL: ${video.url}`);
                console.log(`   Views: ${video.viewCount?.toLocaleString() || 'Unknown'}`);
                console.log(`   Published: ${video.date}`);
                console.log('---');
            });
        } else {
            console.log(`No videos found for ${formattedHandle}.`);
        }
    } catch (error) {
        console.error('Failed to scrape channel:', error.message);
        process.exit(1);
    }
}

scrapeChannel();
