/*
Spreadsheet
tg_user_info
  - tg_user_id	
  - tg_pass_grant
tg_user_subscription
  - tg_user_id
  -	tg_chat_id
  -	subscribe_item
  -	subscribe_link
  -	last_length
  -	last_send
  -	lang
  -	last_error
tg_vid_queue
  - tg_user_id
  -	tg_chat_id
  -	tg_link
  -	tg_m3u8_content
  -	result
*/

function mandarkbotEtl() {
  
  var sheet = SpreadsheetApp.openById("xxx").getSheetByName("tg_user_subscription");
  var data = sheet.getRange(2,1,sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  
  for(var i = 0; i < data.length; i++) {        
    var userId = data[i][0];
    var chatId = data[i][1];    
    var feedUrl = data[i][3];
    var prelength = data[i][4];
    var lastSendDate = data[i][5];
    var srclang = data[i][6];
    
    switch (srclang) {
      case 'Language - JP':
        srclang = 'ja';
        break;
      case 'Language - KR':
        srclang = 'ko';
        break;
    }
    
    try {
      resp = UrlFetchApp.fetch(feedUrl);
    } catch(e) {
      var nowDate = new Date().toLocaleString('en-US', {timeZone: 'Asia/Taipei'});
      sheet.getRange(i + 2, 8).setValue('[' + nowDate + '] ' + e);
      continue;    
    }        
    
    if(resp.getResponseCode() == 200) {
      // content change, need to send
      if(resp.getContentText().length != prelength) {        
        var lastSend = '';
        var allDone = true;
        var doc = XmlService.parse(resp.getContentText());
        if(feedUrl.indexOf('www.youtube.com') != -1) {          
          var atomNs = XmlService.getNamespace('http://www.w3.org/2005/Atom');
          var y2Ns = XmlService.getNamespace('http://www.youtube.com/xml/schemas/2015');
          var yahooNs = XmlService.getNamespace('http://search.yahoo.com/mrss/');
          var entrys = doc.getRootElement().getChildren('entry', atomNs);
          
          for(var j = 0; j < entrys.length; j++) {
            var pubDate = new Date(entrys[j].getChildText('published', atomNs)).toLocaleString('en-US', {timeZone: 'Asia/Taipei'});
            if(Date.parse(pubDate).valueOf() > Date.parse(lastSendDate).valueOf()) {              
              var title = entrys[j].getChildText('title', atomNs);
              if(srclang != '') {
                var transTitle = LanguageApp.translate(title, srclang, 'zh-TW');
                title = title + ' (' + transTitle +')';
              }              
              /* var description = entrys[j].getChild('group', yahooNs).getChildText('description', yahooNs);
              if(description.length > 384) {
                description = description.substring(0, 384);
              }*/
              var link = entrys[j].getChild('link', atomNs).getAttribute('href').getValue();
              
              try {
                var msg = {
                  'chat_id': chatId,
                  'text': title + '\n' + link
                }
                if(tgSendMsg(msg, 'message')) {
                  lastSend = new Date().toLocaleString('en-US', {timeZone: 'Asia/Taipei'});             
                }
              } catch(e) {
                var nowDate = new Date().toLocaleString('en-US', {timeZone: 'Asia/Taipei'});
                sheet.getRange(i + 2, 8).setValue('[' + nowDate + '] [' + title + '] [' + link + '] post to telegram chat fail. ' + e);
                allDone = false;
                break;
              }
            }                         
          }          
        } else {
          var items = doc.getRootElement().getChild('channel').getChildren('item');
          for(var k = 0; k < items.length; k++) {
            var pubDate = new Date(items[k].getChildText('pubDate')).toLocaleString('en-US', {timeZone: 'Asia/Taipei'});
            if(Date.parse(pubDate).valueOf() > Date.parse(lastSendDate).valueOf()) {
              var title = items[k].getChildText('title');
              if(srclang != '') {                
                var transTitle = LanguageApp.translate(title, srclang, 'zh-TW');
                title = title + ' (' + transTitle +')';                 
              }    
              var description = tagExtract(items[k].getChildText('description'), 'hyperlink');
              if(description.length > 384) {
                description = description.substring(0, 384);
              }
              var link = items[k].getChildText('link');
              if(link.indexOf('nitter.net') != -1) {
                vidHelper(userId, chatId, link);
              }
              try {
                var msg = {
                  'chat_id': chatId,
                  'text': title + '\n' + description + '\n' + link
                }
                if(tgSendMsg(msg, 'message')) {
                  var mediaPhoto = tagExtract(items[k].getChildText('description'),'mediaGroup');
                  if(mediaPhoto.length > 1) {
                    var msg = {
                      'chat_id': chatId,
                      'media': mediaPhoto    
                    };
                    if(tgSendMsg(msg, 'mediaGroup')) {
                      lastSend = new Date().toLocaleString('en-US', {timeZone: 'Asia/Taipei'});             
                    }
                  } else {
                    lastSend = new Date().toLocaleString('en-US', {timeZone: 'Asia/Taipei'});             
                  }                  
                }
              } catch(e) {
                var nowDate = new Date().toLocaleString('en-US', {timeZone: 'Asia/Taipei'});
                sheet.getRange(i + 2, 8).setValue('[' + nowDate + '] [' + title + '] [' + link + '] post to telegram chat fail. ' + e);
                allDone = false;
                break;
              }                            
            }            
            
          }                    
        }
        if(lastSend != '') {
          sheet.getRange(i + 2, 6).setValue(lastSend);
        }
        if(allDone) {
          sheet.getRange(i + 2, 5).setValue(resp.getContentText().length);          
        }        
      }
    }
  }
}

function tagExtract(input, feedback) {
  var xmlUnescape = input.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&apos;/g,'\'').replace(/&quot;/g,'"');
  var extractHref  = /href=\"(.*?)\"/g;
  var extractImgSrc = /img src=\"(.*?)\"/g;
  var hyperlinkCollection = '';
  var imglinkCollection = [];
  while ((res = extractHref.exec(xmlUnescape)) !== null) {
    hyperlinkCollection += res[1] + "\n";
  };  
  while ((res = extractImgSrc.exec(xmlUnescape)) !== null) {
    hyperlinkCollection += res[1] + "\n";
    imglinkCollection.push({'type': 'photo', 'media': res[1]});
  };
  switch (feedback) {
    case 'mediaGroup':
      return imglinkCollection;
      break;
    case 'hyperlink':
      return hyperlinkCollection.slice(0,-1);
      break;
  }
  return;
}

function tgSendMsg(msg, type) {
  var tglink = 'https://api.telegram.org/botxxxxxxxxxx:token/';
  switch (type) {
    case 'message':
      tglink += 'sendMessage';
      break;
    case 'mediaGroup':
      tglink += 'sendMediaGroup';
      break;
  }     
  
  var payload = JSON.stringify(msg);
  var option = {
    'headers': {
      'Content-Type': 'application/json'
    },
    'method': 'post',
    'payload': payload
  };
  var rc = UrlFetchApp.fetch(tglink, option);  
  return (rc.getResponseCode() == 200) ? true : false;
}


function vidHelper(userId, chatId, link) {
  var opt = {
    'headers': {
      'Cookie': 'hlsPlayback=on'
    }
  };
  
  try {
    var rawSrc = UrlFetchApp.fetch(link, opt);
    if(rawSrc.getResponseCode() == 200) {
      var extractM3u8  = /data-url=\"(.*?)\"/g;
      var ext1 = ''
      while ((res = extractM3u8.exec(rawSrc.getContentText())) !== null) {
        ext1 += res[1];
      };      
      ext1 = decodeURIComponent(ext1);  
      var expression = /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/g;
      while ((res = expression.exec(ext1)) !== null) {
        ext1 = res[0]; // get 1st m3u8 link
      };
      var nest1 = UrlFetchApp.fetch(ext1);  
      if(nest1.getResponseCode() == 200) {
        var resolution = [];
        nest1.getContentText().split('\n').forEach(function(lineText){
          if(lineText.indexOf('m3u8') != -1) {
            resolution.push(lineText);
          }
        });
        var nest2 = UrlFetchApp.fetch('https://video.twimg.com' + resolution[resolution.length - 1]);  
        if(nest2.getResponseCode() == 200) {
          var targetPlaylist = '';
          nest2.getContentText().split('\n').forEach(function(lineText) {
            if(lineText.indexOf('.ts') != -1) {
              targetPlaylist += 'https://video.twimg.com' + lineText + '\n';
            } else {
              targetPlaylist += lineText + '\n';
            }
          });
          var sheet = SpreadsheetApp.openById("xxx").getSheetByName("tg_vid_queue");
          sheet.appendRow([userId, chatId, link, targetPlaylist, 'ready']);
          //
        }
      }
    }    
  } catch (e) {
    //
  }    
}

function test1() {
  vidHelper('0600', '0600', 'https://nitter.net/MotoGP/status/1317737976307339266#m');
}

// ffmpeg -protocol_whitelist file,http,https,tcp,tls -i "1.m3u8.txt" -c copy media.mp4