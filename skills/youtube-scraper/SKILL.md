---
name: youtube_scraper
description: Scrapes the latest videos and view counts from any YouTube channel using the Apify API to analyze competitor performance.
---

# YouTube Scraper Skill

You are equipped with a custom tool to scrape data from YouTube channels. Using the Apify API, you can retrieve the 10 most recent videos from a specified channel, including their titles, view counts, and publication dates. This is highly useful for competitor analysis and seeing what topics perform well.

## Usage

When the user asks you to analyze a YouTube channel, check recent videos from a creator, or "spy on" a competitor's YouTube channel, follow these steps:

**Note: Ensure the `APIFY_API_KEY` environment variable is set in the VPS environments before running.**

1. Identify the YouTube channel handle (e.g., `@MrBeast`, `@sameer-vish0`) from the user's prompt. If one is not provided, ask for it.
2. Run the included `scraper.js` Node script using the `node` command via the bash/run_command tool. Pass the channel handle as the argument.
   Example: `node "/home/bill/.openclaw/workspace/skills/youtube-scraper/scraper.js" "@ChannelHandle"`
3. Read the terminal output. It will contain the 10 most recent videos and their view counts.
4. Analyze the data for the user. Highlight which videos are getting the most views (viral hits) and which are getting the least (flops), and offer conclusions on what content topics they should pursue based on the data.
