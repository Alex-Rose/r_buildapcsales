const request = require('request');
const fs = require('fs');
const config = require('./config.js');
const ProductManager = require('./productManager.js');
const MailManager = require('./mailManager.js');
const Product = require('./product.js');

const URL = 'https://www.reddit.com/r/buildapcsales/new/.json?count=20';

let s_mailManager = undefined;
let s_prodManager = undefined;

let s_lastFileContent = undefined; 
let s_lastExecution = undefined;

let lastPostId = undefined;
let matchedItemList = [];
let posts = [];
// let dailyDigest = {
//   time: 0,
//   posts: []
// };

async function loadFile() {
  return new Promise((resolve, reject) => {
    try {
      fs.readFile(config.LAST_FILE, (err, data) => {
        if (err) {
          return reject(err);
        }
        
        try {
          s_lastFileContent = JSON.parse(data);
          lastPostId = s_lastFileContent.last;
          s_lastExecution = s_lastFileContent.lastExecution ? new Date(Date.parse(s_lastFileContent.lastExecution)) : new Date(0);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function saveFile() {
  return new Promise((resolve, reject) => {
    const data = {
      last: lastPostId,
      lastExecution: (new Date()).toJSON(),
      mailState: s_mailManager.getState(),
      pmState: s_prodManager.getState(),
    };
    
    fs.writeFile(config.LAST_FILE, JSON.stringify(data), (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}


let depth = 0;

async function getContent(last = undefined) {
  return new Promise( (resolve, reject) => {
    if (depth++ > 10) {
      throw new Error(`Passed 10th call, something is probably wrong`);
    }

    let url = URL;
    if (last) {
      url = url + '&before=' + last;
    }

    console.log(url);

    request(url, (error, response, body) => {
      // console.error('error:', error); 
      // console.log('statusCode:', response && response.statusCode); 

      if (!response || response.statusCode != 200) {
        return reject('Bad response ' + JSON.stringify(response));
      }
  
      const data = JSON.parse(body);
      printAllTitles(data.data.children);
  
      for (const p in data.data.children) {
        const product = new Product('reddit', data.data.children[p].data);
        product.initializeData();
        // posts.push(data.data.children[p].data);
        posts.push(product);
      }
  
      if (data.data.children.length > 0) {
        
        let newLast = data.data.children[0].data.name;
        resolve(newLast);
      } else {
        resolve();
      }
    });
  });
}

function printAllTitles(children) {
  for (const i in children) {
    const post = children[i];
    console.log(`[${i}] ${post.data.title}`);
  }
}

async function main(runFull = false) {
  await loadFile().catch((err) => {
    console.log(err);
    lastPostId = undefined;
  });

  const mailState = s_lastFileContent && s_lastFileContent.mailState ? s_lastFileContent.mailState : undefined;
  s_mailManager = new MailManager(config, mailState);

  const pmState = s_lastFileContent && s_lastFileContent.pmState ? s_lastFileContent.pmState : undefined;
  s_prodManager = new ProductManager(config, s_mailManager, pmState);


  let last = runFull ? undefined : lastPostId;
  let previousLastPostId = lastPostId;

  try {
    do {
      last = await getContent(last);
      if (last) {
        lastPostId = last;
      }
    } while (last);
  } catch (err) {
    console.log(err);
  }
  
  // If no new posts, check that the previous post wasn't deleted
  if (posts.length === 0) {
    let newLast =  await getContent();
    if (previousLastPostId === newLast) {
      if (posts.length === 0) {
        console.log(`Something's wrong. 0 new posts`);
      } else {
        console.log(`No new posts since {${previousLastPostId}}: \n${posts[0].title}`);
        posts = [];
      }
    } else {
      console.log(`Previous post {${previousLastPostId}} was no longer available`);
      lastPostId = newLast;
    }
  }

  //searchTitles(posts);
  s_prodManager.searchTitles(posts);

  // const body = getMailBody(matchedItemList, 'Here are most recent posts');
  // const plainText = getMailPlainText(matchedItemList);
  // await sendMail(body, plainText).catch(console.error);

  // await sendDailyDigestIfNeeded();

  s_mailManager.sendMailsAndCleanup();

  await saveFile().catch(console.log);
}

main(true);
//getContent();