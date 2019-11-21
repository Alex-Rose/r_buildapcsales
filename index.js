const request = require('request');
const fs = require('fs');
const nodemailer = require('nodemailer');
const config = require('./config.js');

const URL = 'https://www.reddit.com/r/buildapcsales/new/.json?count=20';

let lastPostId = undefined;
let matchedItemList = [];
let posts = [];
let dailyDigest = {
  time: 0,
  posts: []
};

async function loadFile() {
  return new Promise((resolve, reject) => {
    try {
      fs.readFile(config.LAST_FILE, (err, data) => {
        if (err) {
          return reject(err);
        }
        
        try {
          const content = JSON.parse(data);
          lastPostId = content.last;
          dailyDigest = content.dailyDigest;
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
      dailyDigest: dailyDigest,
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
        posts.push(data.data.children[p].data);
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

function searchTitles(low, high) {
  const regex1 = config.PRODUCTS[0].regex;
  //const regex1 = /(RAM)/gmi;
  const priceRegex = /((\$+\ *[0-9]+(\.[0-9]{2})?(\ *\$+)?)|([0-9]+(\.[0-9]{2})))/gm;
  low = config.PRODUCTS[0].low;
  high = config.PRODUCTS[0].high;

  for (const i in posts) {
    const title = posts[i].title;

    if (title.match(regex1)) {
      console.log(`Title match ${title}`);
      const prices = title.match(priceRegex);

      let matchedPrice = 0;
      let sendMail = false;
      for (const p in prices) {

        const price = parseFloat(prices[p].replace('$', '').trim());
        if (price > low && price < high) {
          console.log(`Price match [$${price}] ${title}`);
          matchedPrice = price;
          sendMail = true;
          break;
        }
      }

      if (sendMail) {
        matchedItemList.push({'price': matchedPrice, data: posts[i]});
      } else {
        const price = pickReducedPrice(prices);
        dailyDigest.posts.push({'price': price, data: posts[i]});
      }
    }
  }
}

function pickReducedPrice(prices) {
  let priceValues = [];
  for (const p in prices) {
    priceValues.push(parseFloat(prices[p].replace('$', '').trim()));
  }

  priceValues.sort()

  if (priceValues.length == 1) {
    return priceValues[0];
  }

  const largest = priceValues[priceValues.length - 1];
  
  // Assume that the items are never going to be more than 50% off
  if (priceValues[priceValues.length - 2] / largest > 0.5) {
    return priceValues[priceValues.length - 2];
  } else {
    return largest;
  }
}

function getAgoString(it) {
  const now = Math.floor(new Date().getTime()/1000.0);
  let ago = Math.floor((now - it.data.created_utc) / 60);
  let unit = 'm';
  if (ago > 60) {
    ago = Math.floor(ago / 60);
    unit = "h";

    if (ago > 24) {
      ago = Math.floor(ago / 24);
      unit = "d";
    }
  }

  ago = ago.toString() + unit;
  return ago;
}

function getMailBody(posts, description) {
  let listItems = '';
  for (const i in posts) {
    const it = posts[i];
    const ago = getAgoString(it);
    listItems = listItems + `<li><a href="https://reddit.com${it.data.permalink}">[$${it.price}] ${it.data.title}</a> <small>${ago} ago</small></li>`;
  }

  const body = 
  `<html>
  <body>
    <div>
      ${description}
    </div>
    <div>
      <ul>
        ${listItems}
      </ul>
    </div>
  </body>
  </html>`;

    return body;
}

function getMailPlainText(posts) {
  let listItems = '';
  for (const i in posts) {
    const it = posts[i];
    const ago = getAgoString(it);
    listItems = listItems + `[$${it.price}] ${it.data.title} ${ago} ago\n`;
  }

  return listItems;
}

async function sendMail(body, plainText) {
  if (matchedItemList.length == 0) return;
    let transport = nodemailer.createTransport(config.TRANSPORT_OPTIONS);

  const message = {
    from: config.EMAIL_FROM, 
    to: config.EMAIL_TO, 
    subject: `/r/buildapcsales ${config.PRODUCTS[0].name}`, 
    html: body,
    alternatives: [{
      contentType: 'text/plain',
      content: plainText
    }]
  };
  
  let info = await transport.sendMail(message);
  console.log(`Message sent: ${info.messageId}`);
}

async function sendDailyDigestIfNeeded() {
  if ((new Date().getTime() - dailyDigest.time) > 23.5 * 60 * 60 * 1000)
  {
    const body = getMailBody(dailyDigest.posts, 'Here are all the items that showed up, but didn\'t fit in your price range');
    const plainText = getMailPlainText(dailyDigest.posts);

    let success = true;
    await sendMail(body, plainText).catch((err) => {
      console.log(err);
      success = false;
    });

    if (success) {
      dailyDigest.posts = [];
      dailyDigest.time = new Date().getTime();
    }
  }
}

async function main(runFull = false) {
  await loadFile().catch((err) => {
    console.log(err);
    lastPostId = undefined;
  });

  if (!dailyDigest) {
    dailyDigest = {
      time: 0,
      posts: []
    };
  }

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

  searchTitles(posts);

  const body = getMailBody(matchedItemList, 'Here are most recent posts');
  const plainText = getMailPlainText(matchedItemList);
  await sendMail(body, plainText).catch(console.error);

  await sendDailyDigestIfNeeded();

  await saveFile().catch(console.log);
}

main();
//getContent();