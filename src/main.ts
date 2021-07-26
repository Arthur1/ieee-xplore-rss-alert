// IEEE Transactions on Signal Processing - new TOC

const rssUrl = "https://ieeexplore.ieee.org/rss/TOC78.XML";
const slackUsername = "IEEE Transactions on Signal Processing";

const TIMESTAMP_FILE_NAME = "timestamp.txt";
const POST_IDS_FILE_NAME = "post_ids.json";

// an item posted on IEEE Xplore
interface Post {
  title: string;
  id: string;
  url: string;
  description: string;
  authors: string;
}

/*
function setProperties() {
  const store = PropertiesService.getScriptProperties();
  const folderId = "{folderId}";
  const slackWebhookUrl = "{slackWebhookUrl}";
  store.setProperty("FOLDER_ID", folderId);
  store.setProperty("SLACK_WEBHOOK_URL", slackWebhookUrl);
}
*/

function main() {
  const store = PropertiesService.getScriptProperties();
  const folderId = store.getProperty("FOLDER_ID") ?? "";
  const slackWebhookUrl = store.getProperty("SLACK_WEBHOOK_URL") ?? "";

  const folder = DriveApp.getFolderById(folderId);

  // send HTTP request to rssUrl
  const response = UrlFetchApp.fetch(rssUrl);

  // parse RSS in XML format
  const document = XmlService.parse(response.getContentText());
  const root = document.getRootElement();
  const channel = root.getChild("channel");

  // get timestamp from current XML
  const year = channel.getChild("year").getText().trim();
  const month = channel.getChild("month").getText().trim();
  const day = channel.getChild("day").getText().trim();
  Logger.log(`${year} ${month} ${day}`);
  const currentVersionTimestamp = Date.parse(`${day} ${month} ${year}`);

  let timestampFile: GoogleAppsScript.Drive.File;
  if (folder.getFilesByName(TIMESTAMP_FILE_NAME).hasNext()) {
    // get timestamp file
    timestampFile = folder.getFilesByName(TIMESTAMP_FILE_NAME).next();
    // exit if the date has NOT been updated
    const lastVersionTimestamp = parseInt(
      timestampFile.getBlob().getDataAsString() || "0"
    );
    if (currentVersionTimestamp <= lastVersionTimestamp) {
      Logger.log(
        `RSS file has NOT been updated. current: ${year} ${month} ${day}`
      );
      return;
    }
  } else {
    // create timestamp file
    timestampFile = folder.createFile(TIMESTAMP_FILE_NAME, "", "text/plain");
  }

  // save current
  timestampFile.setContent(currentVersionTimestamp.toString());

  const posts: Post[] = channel.getChildren("item").map((item) => ({
    title: item.getChild("title").getText(),
    id: item.getChild("guid").getText(),
    url: item.getChild("link").getText(),
    description: item.getChild("description").getText(),
    authors: item.getChild("authors").getText(),
  }));

  let postIdsFile: GoogleAppsScript.Drive.File;
  let newPosts: Post[];
  let oldPostIds: Post["id"][];
  if (folder.getFilesByName(POST_IDS_FILE_NAME).hasNext()) {
    // get timestamp file
    postIdsFile = folder.getFilesByName(POST_IDS_FILE_NAME).next();
    oldPostIds = JSON.parse(postIdsFile.getBlob().getDataAsString());
    const oldPostIdsSet = new Set(oldPostIds);

    // exit if the date has NOT been updated
    newPosts = posts.filter((post) => !oldPostIdsSet.has(post.id));
  } else {
    // create timestamp file
    postIdsFile = folder.createFile(
      POST_IDS_FILE_NAME,
      JSON.stringify([]),
      "application/json"
    );
    newPosts = posts;
    oldPostIds = [];
  }

  if (!newPosts.length) {
    Logger.log('No new posts have been added');
    return;
  }

  const newPostIds = newPosts.map((post) => post.id);
  const postIds = [...oldPostIds, ...newPostIds];
  postIdsFile.setContent(JSON.stringify(postIds));

  // Slack Webhook
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(createSlackPayload(newPosts)),
  };
  UrlFetchApp.fetch(slackWebhookUrl, options);

  Logger.log(`Executed successfully`);
}

const createSlackPayload = (posts: Post[]) => {
  const blocks = [
    {
      type: "section",
      text: {
        type: "plain_text",
        emoji: true,
        text: ":bell: 以下の投稿が追加されました",
      },
    },
    {
      type: "divider",
    },
  ];
  const postBlocks = posts.map((post) => ({
    type: "section",
    text: {
      type: "plain_text",
      text: post.title,
    },
    accessory: {
      type: "button",
      text: {
        type: "plain_text",
        emoji: true,
        text: ":link:",
      },
      url: post.url,
    },
  }));

  return {
    blocks: [...blocks, ...postBlocks],
  };
};
