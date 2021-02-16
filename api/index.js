/*
  This express server sits in front of all initial requests with the sole purpose
  of intercepting a social media bot and sending a blank html page with correctly populated
  meta tags in the head. Otherwise it hands off to the Vue app per usual by sending to
  /dist/index.html
 */
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const apiUrl = "https://backend.betogram.com/api";
const s3BucketUrl = "https://betogramimages.s3.eu-central-1.amazonaws.com/news_images/"
const port = process.env.SM_WORKER_PORT || 5000;

const metaTitle = 'Betogram';
const metaDescription = 'The Social betting platform, designed to revolutionize sportsbetting and it´s whole experience.';
const metaImage = 'https://betogramimages.s3.eu-central-1.amazonaws.com/thumbnails_new_1-1.png';

const app = express();
var userAgent;

console.log('running server');

app.use(express.static(path.join(__dirname, '../dist')));

app.use((req, resp, next) => {
  userAgent = req.headers['user-agent'];
  if (isSocialMediaUserAgent(userAgent)) {
    next()
  } else {
    console.log(path.join(__dirname, '../dist/index.html'));
    resp.sendFile(path.join(__dirname, '../dist/index.html'));
  }
})

app.get('/health', (req, resp) => {
  console.log('checking health');
  resp.sendStatus(200);
})

app.get('/news/:newsID', (req, resp) => {
  let htmlSource;
  fetchNewsDataFromAPI(req.params.newsID).then(data => {
    htmlSource = getHtmlSourceWithMeta(data.news_data);
    resp.send(htmlSource);
  }).catch((error) => {
    htmlSource = getHtmlSourceWithMeta(null);
    resp.send(htmlSource);
    logError(error);
  });
});


app.get('*', (req, resp) => {
  console.log('all routes');
  let htmlSource = getHtmlSourceWithMeta(null);
  resp.send(htmlSource);

})

app.listen(port, () => console.log(`Crawler listening on port ${port}`));

function isSocialMediaUserAgent(ua) {
  ua = ua.toLowerCase();
  return ua.indexOf("slackbot") !== -1 ||
      ua.indexOf("facebot") !== -1 ||
      ua.indexOf("twitterbot") !== -1 ||
      ua.indexOf("facebookexternalhit") !== -1;
}

function fetchNewsDataFromAPI(newsID) {
  return new Promise((resolve, reject) => {
    axios.get(`${apiUrl}/get-individual-news/${newsID}`).then(resp => {
      resolve(resp.data);
    }).catch(error => {
      reject(error);
    })
  });
}

function getHtmlSource() {
  return `
  <html>
    <head>
      <title>Betogram</title>
      <meta charset="utf-8">
      <meta class="meta-description" name="description" content="metaDescription">
      <!-- Google+ / Schema.org -->
      <meta class="meta-title" itemprop="name" content="metaTitle">
      <meta class="meta-description" itemprop="description" content="metaDescription">
      <meta class="meta-image" itemprop="image" content="metaImage">
      <!-- Twitter Meta -->
      <meta name="twitter:card" content="summary_large_image" />
      <meta class="meta-title" name="twitter:title" content="metaTitle" />
      <meta class="meta-description" name="twitter:description" content="metaDescription" />
      <meta class="meta-image" name="twitter:image" content="metaImage"/>
      <!-- Facebook Meta -->
      <meta property=fb:app_id content=415117352570924>
      <meta id="facebook-link" property="og:url" content="" />
      <meta property="og:type" content="article" />
      <meta class="meta-title" property="og:title" content="metaTitle" />
      <meta class="meta-description" property="og:description" content="metaDescription" />
      <meta class="meta-image" property="og:image" content="metaImage" />
    </head>
    <body>
    </body>
  </html>`;
}
function getHtmlSourceWithMeta(newsData) {
  let htmlSource = getHtmlSource();
  if (!newsData || !newsData.id) {
    htmlSource = htmlSource.replace(/metaTitle/g, metaTitle);
    htmlSource = htmlSource.replace(/metaDescription/g, metaDescription);
    htmlSource = htmlSource.replace(/metaImage/g, metaImage);
  } else {
    htmlSource = htmlSource.replace(/metaTitle/g, newsData.title);
    htmlSource = htmlSource.replace(/metaDescription/g, newsData.small_decp);
    htmlSource = htmlSource.replace(/metaImage/g, `${s3BucketUrl}${newsData.cover_image}`);
  }
  return htmlSource;
}

function logError(error) {
  const errorLog = {
    'user-agent': userAgent,
    'error': error,
  }
  console.log(errorLog);
}
