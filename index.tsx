import { serve } from "bun";
import Anthropic from "@anthropic-ai/sdk";
import screenshotDesktop from "screenshot-desktop";

const anthropic = new Anthropic({
  apiKey: "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",
});

interface JournalEntry {
  timestamp: Date;
  application: string;
  description: string;
  screenshot: string; // Base64 encoded screenshot
}

interface ApplicationJournal {
  [application: string]: JournalEntry[];
}

const applicationJournal: ApplicationJournal = {};
let journalingInterval: NodeJS.Timeout | null = null;
let isJournaling = false;
let lastUsedApplication: JournalEntry | null = null;

function addJournalEntry(entry: JournalEntry) {
  if (!applicationJournal[entry.application]) {
    applicationJournal[entry.application] = [];
  }
  applicationJournal[entry.application].push(entry);
  lastUsedApplication = entry;
}

function getRecentEntries(limit: number = 5): JournalEntry[] {
  const entries = Object.values(applicationJournal)
    .flat()
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit)
  return entries.map((entry) => {
    return {
      ...entry,
      description: ""
    }
  })
}

async function takeScreenshotAndAnalyze() {
  try {
    const displays = await screenshotDesktop.listDisplays();
    const img = await screenshotDesktop({ screen: displays[displays.length - 1].id });
    const base64data = img.toString('base64');

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1000,
      temperature: 0,
      system: "Analyze the following screenshot and provide a brief description of what's happening on the user's screen. Consider the previous entries to provide context on what the user has been working on. Format your response as follows:\n\nSuspected Application - \nDescription - ",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64data
              }
            },
            // {
            //   type: "text",
            //   text: `Previous entries: ${JSON.stringify(getRecentEntries())}`
            // }
          ]
        }
      ]
    });

    const content = msg.content[0].text;
    const [applicationLine, ...descriptionLines] = content.split('\n');
    const application = applicationLine.split('-')[1].trim();
    const description = descriptionLines.join('\n').replace('Description - ', '').trim();

    const newEntry: JournalEntry = {
      timestamp: new Date(),
      application,
      description,
      screenshot: base64data
    };

    addJournalEntry(newEntry);
    console.log("New journal entry:", newEntry);
  } catch (error) {
    console.error("Error taking screenshot or analyzing:", error);
  }
}

function startJournaling() {
  if (!isJournaling) {
    isJournaling = true;
    journalingInterval = setInterval(takeScreenshotAndAnalyze, 10000);
    console.log("Journaling started");
  }
}

function stopJournaling() {
  if (isJournaling && journalingInterval) {
    clearInterval(journalingInterval);
    isJournaling = false;
    journalingInterval = null;
    console.log("Journaling stopped");
  }
}

function addMockEntries() {
  const mockEntries = [
    {
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      application: "Visual Studio Code",
      description: "The user is editing a TypeScript file in Visual Studio Code. The code appears to be related to a web application using React.",
      screenshot: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==" // Placeholder base64 image
    },
    {
      timestamp: new Date(Date.now() - 600000), // 10 minutes ago
      application: "Google Chrome",
      description: "The browser is open to a Stack Overflow page. The user seems to be researching a question about React hooks.",
      screenshot: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==" // Placeholder base64 image
    },
    {
      timestamp: new Date(Date.now() - 900000), // 15 minutes ago
      application: "Slack",
      description: "The Slack application is open, showing a conversation in a channel named 'team-frontend'. The discussion appears to be about a new feature implementation.",
      screenshot: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==" // Placeholder base64 image
    }
  ];

  mockEntries.forEach(entry => addJournalEntry(entry));
}

function generateHtml() {
  // Get all entries and sort them by timestamp (most recent first)
  const allEntries = Object.values(applicationJournal)
    .flat()
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Activity Journal</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f0f0f0; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #333; text-align: center; }
        .controls { text-align: center; margin-bottom: 20px; }
        button { padding: 10px 20px; margin: 0 10px; background-color: #4CAF50; color: white; border: none; cursor: pointer; }
        button:hover { background-color: #45a049; }
        .status { text-align: center; font-weight: bold; margin-bottom: 20px; }
        .entry { background-color: #fff; border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .entry-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .timestamp { color: #666; font-size: 0.8em; }
        .application { font-weight: bold; color: #4CAF50; }
        .screenshot { max-width: 100%; height: auto; margin-top: 10px; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Activity Journal</h1>
        <div class="controls">
          <button onclick="fetch('/start').then(() => location.reload())">Start Journaling</button>
          <button onclick="fetch('/stop').then(() => location.reload())">Stop Journaling</button>
          <button onclick="fetch('/mock').then(() => location.reload())">Mock Run</button>
        </div>
        <p class="status">Status: ${isJournaling ? 'Journaling' : 'Not Journaling'}</p>
  `;

  for (const entry of allEntries) {
    html += `
      <div class="entry">
        <div class="entry-header">
          <span class="application">${entry.application}</span>
          <span class="timestamp">${entry.timestamp.toLocaleString()}</span>
        </div>
        <p>${entry.description}</p>
        <img class="screenshot" src="data:image/png;base64,${entry.screenshot}" alt="Screenshot">
      </div>
    `;
  }

  html += `
      </div>
      <script>
        setTimeout(() => location.reload(), 5000);
      </script>
    </body>
    </html>
  `;

  return html;
}

const server = serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === '/start') {
      startJournaling();
      return new Response("Journaling started");
    }
    
    if (url.pathname === '/stop') {
      stopJournaling();
      return new Response("Journaling stopped");
    }
    
    if (url.pathname === '/mock') {
      addMockEntries();
      return new Response("Mock entries added");
    }
    
    return new Response(generateHtml(), {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`Server running at http://localhost:${server.port}`);