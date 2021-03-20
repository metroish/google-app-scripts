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

function doPost(request) {  
  var tgBotInput = JSON.parse(request.postData.contents);  
  //var rc = ContentService.createTextOutput(JSON.stringify({'result': 'Success!'})).setMimeType(ContentService.MimeType.JSON);    
  var rc = '';
  var userId = tgBotInput.message.from.id;
  var chatId = tgBotInput.message.chat.id;
  var textContent = tgBotInput.message.text.trim();
  var cmdCombo = tgBotInput.message.entities;
  
  if(!checkPermission(userId, chatId, textContent)) {
    return rc;
  }
  
  // normal chat
  if(cmdCombo == null) {
    cmdStart(chatId);
    return rc;
  }
  
  if (cmdCombo[0].type == 'bot_command') {
    var spaceIndex = textContent.indexOf(" ",0);
    var cmd = '';
    var content = '';
    
    if(spaceIndex == -1) {
      cmd = textContent;
    } else {
      cmd = textContent.substring(0, spaceIndex);
      content = textContent.substring(spaceIndex + 1);    
    }    
    
    if(content.indexOf('www.youtube.com') != -1) {
      content = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + content.slice(content.lastIndexOf('/') + 1, content.length);      
    }    
    
    switch (cmd) {
      case '/start':
        cmdStart(chatId);
        break;
      case '/add':
        cmdAdd(userId, chatId, content);
        break;
      case '/list':
        cmdList(userId, chatId);
        break;
      case '/del':
        cmdDel(userId, chatId, content);
        break;
      case '/srclang':
        srclang(userId, chatId, content);
        break;
      case '/cancel':
        cancel(chatId);
        break;
      default:
        cmdStart(chatId);
    }       
  } 
  return rc;
}

function cmdStart(chatId) {
  var msg = {
    'chat_id': chatId,
    'text': 'This is a simple Telegram Bot for subscribe RSS feeds.\n\nYou could use these commands with this bot as below.\n\nadd - add subscription url\ndel - delete subscription url\nlist - list subscription url\nsrclang - set source lang on each url\ncancel - cancel current operation\n\nYou have to input the passcode to get approvement to use this bot at first time.'
  }
  tgSend(msg);
}

function cmdAdd(userId, chatId, content) {
  if(content == '') {
    var msg = {
      'chat_id': chatId,
      'text': 'Please append the URL after /add command.'
    }
    tgSend(msg);
    return;
  } 
  
  var expression = /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
  var regex = new RegExp(expression);
  if(!content.match(regex)) {
    var msg = {
      'chat_id': chatId,
      'text': 'Add fail, the URL is not valid.'
    }
    tgSend(msg);
    return;
  }
  
  try {
    var resp = UrlFetchApp.fetch(content);
    if(resp.getResponseCode() == 200) {
      var title = '';
      if(content.indexOf('www.youtube.com') != -1) {
        var y2namespace = XmlService.getNamespace('http://www.w3.org/2005/Atom')
        title = XmlService.parse(resp.getContentText()).getRootElement().getChildText('title', y2namespace);                
      } else {
        title = XmlService.parse(resp.getContentText()).getRootElement().getChild('channel').getChildText('title');
      }        
      
      var sheet = SpreadsheetApp.openById("xxx").getSheetByName("tg_user_subscription");
      sheet.appendRow([userId, chatId, title , content, 0, new Date().toLocaleString('en-US', {timeZone: 'Asia/Taipei'}), '', '']);
      var msg = {
        'chat_id': chatId,
        'text': 'Add success.'
      };
      tgSend(msg);      
    }
  } catch (e) {
    var msg = {
      'chat_id': chatId,
      'text': 'Add fail, the URL is not working. ' + e
    };
    tgSend(msg);
  } 
}

function cmdList(userId, chatId) {
  var list = 'Below is your current subscription list.\n';
  var sheet = SpreadsheetApp.openById("xxx").getSheetByName("tg_user_subscription");    
  var rowRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(userId).findAll();
  for(var i = 0; i < rowRange.length ; i++) {
    var listUserId = sheet.getRange(rowRange[i].getRow(), 1).getValue();
    var listChatId = sheet.getRange(rowRange[i].getRow(), 2).getValue();
    if(listUserId == userId && listChatId == chatId) {
      list += sheet.getRange(rowRange[i].getRow(), 3).getValue() + '\n';
    }
  }  
  var msg = {
    'chat_id': chatId,
    'text': list
  };
  tgSend(msg); 
}

function cmdDel(userId, chatId, content) {
  if(content == '') {
    var list = new Array();
    var sheet = SpreadsheetApp.openById("xxx").getSheetByName("tg_user_subscription");    
    var rowRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(userId).findAll();        
    for(var i = 0; i < rowRange.length; i++) {
      if(sheet.getRange(rowRange[i].getRow(), 2).getValue() == chatId) {        
        list.push([{'text':'/del ' + sheet.getRange(rowRange[i].getRow(), 3).getValue()}]);
      }
    }      
    var msg = {
      'chat_id': chatId,
      'text': 'Please click the item you want to delete below.',
      'reply_markup': {
        'keyboard': list, 
        'resize_keyboard': true, 
        'one_time_keyboard': true,
        'selective': true
      }
    };    
    tgSend(msg);
  } else {
    var sheet = SpreadsheetApp.openById("xxx").getSheetByName("tg_user_subscription");    
    var rowRange = sheet.getRange(2, 3, sheet.getLastRow() - 1, 3).createTextFinder(content).findAll();
    for(var i = 0; i < rowRange.length; i++) {
      var delUserId = sheet.getRange(rowRange[i].getRow(), 1).getValue();
      var delChatId = sheet.getRange(rowRange[i].getRow(), 2).getValue();
      if(delUserId == userId && delChatId == chatId) {
        sheet.deleteRow(rowRange[i].getRow());                    
        var msg = {
          'chat_id': chatId,
          'text': 'Delete [ ' + content + ' ] success.',
          'reply_markup': {
            'remove_keyboard': true
          }
        };
        tgSend(msg);    
        break;
      }
    }                                      
  }
}

function srclang(userId, chatId, content) {
  if(content == '') {
    var list = new Array();
    var sheet = SpreadsheetApp.openById("xxx").getSheetByName("tg_user_subscription");    
    var rowRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(userId).findAll();        
    for(var i = 0; i < rowRange.length; i++) {
      if(sheet.getRange(rowRange[i].getRow(), 2).getValue() == chatId) {        
        list.push([{'text':'/srclang ' + sheet.getRange(rowRange[i].getRow(), 3).getValue()}]);
      }
    }      
    var msg = {
      'chat_id': chatId,
      'text': 'Please click the item you want to set src lang below.',
      'reply_markup': {
        'keyboard': list, 
        'resize_keyboard': true, 
        'one_time_keyboard': true,
        'selective': true
      }
    };    
    tgSend(msg);
  } else if(content == 'Language - JP' || content == 'Language - KR' || content == 'Language - Reset') {
    var sheet = SpreadsheetApp.openById("xxx").getSheetByName("tg_user_subscription");        
    var rowRange = sheet.getRange(2, 7, sheet.getLastRow() - 1, 7).createTextFinder('Ongoing').findAll();
    for(var i = 0; i < rowRange.length; i++) {
      var srclanglUserId = sheet.getRange(rowRange[i].getRow(), 1).getValue();
      var srclangChatId = sheet.getRange(rowRange[i].getRow(), 2).getValue();
      var srclangItem = sheet.getRange(rowRange[i].getRow(), 3).getValue();
      if(srclanglUserId == userId && srclangChatId == chatId) {        
        var textOp = 'Change [ ' + srclangItem + ' ] to ' + content + ' success.';
        if(content == 'Language - Reset') {
          content = '';
          textOp = 'Reset [ ' + srclangItem + ' ] success.';
        }
        sheet.getRange(rowRange[i].getRow(), 7).setValue(content);
        var msg = {
          'chat_id': chatId,
          'text': textOp,
          'reply_markup': {
            'remove_keyboard': true
          }
        };
        tgSend(msg); 
        break;
      }
    }    
  } else {    
    var sheet = SpreadsheetApp.openById("xxx").getSheetByName("tg_user_subscription");    
    var rowRange = sheet.getRange(2, 3, sheet.getLastRow() - 1, 3).createTextFinder(content).findAll();
    for(var i = 0; i < rowRange.length; i++) {
      var srclanglUserId = sheet.getRange(rowRange[i].getRow(), 1).getValue();
      var srclangChatId = sheet.getRange(rowRange[i].getRow(), 2).getValue();
      if(srclanglUserId == userId && srclangChatId == chatId) {
        sheet.getRange(rowRange[i].getRow(), 7).setValue('Ongoing');                    
        var msg = {
          'chat_id': chatId,
          'text': 'You want to change [ ' + content + ' ] src lang. ',
          'reply_markup': {
            'remove_keyboard': true
          }
        };
        tgSend(msg); 
        var langList = new Array()
        langList.push([{'text':'/srclang Language - JP'}]);
        langList.push([{'text':'/srclang Language - KR'}]);
        langList.push([{'text':'/srclang Language - Reset'}]);      
        var langMsg = {
          'chat_id': chatId,
          'text': 'Please choose src lang type below.',
          'reply_markup': {
            'keyboard': langList, 
            'resize_keyboard': true, 
            'one_time_keyboard': true,
            'selective': true
          }
        };    
        tgSend(langMsg);
        break;
      }
    }                                      
  }
}

function cancel(chatId) {
  var msg = {
    'chat_id': chatId,
    'text': 'Cancel success.',
    'reply_markup': {
      'remove_keyboard': true
    }
  };        
  tgSend(msg); 
}

function checkPermission(userId, chatId, content) {
  var sheet = SpreadsheetApp.openById("xxx").getSheetByName("tg_user_info");
  var targetRow = sheet.createTextFinder(userId).findNext();
  if(targetRow != null) {
    var grant = sheet.getRange(targetRow.getRow(), 2).getValue();                  
    if(grant == 'N' && content =='3q9527') {
      sheet.getRange(targetRow.getRow(), 2).setValue('Y');      
      var msg = {
        'chat_id': chatId,
        'text': 'Passcode correct! You could start to use bot service.'
      };      
      tgSend(msg);                  
      return false;
    }
    
    if(grant == 'N' && content !='3q9527') {      
      var msg = {
        'chat_id': chatId,
        'text': 'Please enter your passcode.'
      };      
      tgSend(msg);
      return false;
    }
    return true;
  } else {
    sheet.appendRow([userId, 'N']);
    var msg = {
        'chat_id': chatId,
        'text': 'Please enter your passcode.'
      };   
    tgSend(msg);
    return false;
  }       
}

function tgSend(msg) {    
  var payload = JSON.stringify(msg);
  var option = {
    'headers': {
      'Content-Type': 'application/json'
    },
    'method': 'post',
    'payload': payload
  };  
  UrlFetchApp.fetch('https://api.telegram.org/botxxxxxxxxxx:token/sendMessage', option);
}

function unitTest() {
  // Dummy call to avoid 401 OAuth fail
  // DriveApp.getRootFolder();  
  
  var token = ScriptApp.getOAuthToken();  
  var devUrl = ScriptApp.getService().getUrl();
  var json = {
    "update_id": 9527,
    "message": {
      "message_id": 24,
      "from": {
        "id": 9527,
        "is_bot": false,
        "first_name": "Near",
        "language_code": "zh-hant"
      },
      "chat": {
        "id": 9527,
        "first_name": "Near",
        "type": "private"
      },
      "date": 1602410368,
      "text": "/srclang Language - JP",
      "entities": [
        {
          "offset": 0,
          "length": 6,
          "type": "bot_command"
        }]
    }
  }  
  var payload = JSON.stringify(json);
  var option = {
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'muteHttpExceptions': true
    },
    'method': 'POST',
    'payload': payload
  };  
  var resp = UrlFetchApp.fetch(devUrl, option);
  Logger.log('RC = ' + resp.getResponseCode() + '\n');
  Logger.log('Content = ' + resp.getContentText());
  
  // https://api.telegram.org/botxxxxxxxxxx:token/setWebhook?url=https://script.google.com/macros/s/xxx/exec
  // https://api.telegram.org/botxxxxxxxxxx:token/deleteWebhook
  // https://api.telegram.org/botxxxxxxxxxx:token/getUpdates
  // https://api.telegram.org/botxxxxxxxxxx:token/getWebhookInfo
  
  // https://www.youtube.com/feeds/videos.xml?channel_id=xxxxx
  // https://www.youtube.com/feeds/videos.xml?playlist_id=
  
  /*
  
This is a simple Telegram Bot for subscribe RSS feeds.

You could use these commands with this bot as below.

add - add subscription url
del - delete subscription url
list - list subscription url
srclang - set source lang on each url
cancel - cancel current operation

You have to input the passcode to get approvement to use this bot at first time.
  */
}

function addWebhook(){
  var link = 'https://api.telegram.org/botxxxxxxxxxx:token/setWebhook?url=https://script.google.com/macros/s/xxx/exec'
  var resp = UrlFetchApp.fetch(link);
  Logger.log('RC = ' + resp.getResponseCode() + '\n');
  Logger.log('Content = ' + resp.getContentText());  
}