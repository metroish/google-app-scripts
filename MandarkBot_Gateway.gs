/*
Spreadsheet
tg_user_info
  - tg_user_id	
  - tg_pass_grant
tg_user_subscription
  - tg_user_id
  - tg_chat_id
  - subscribe_item
  - subscribe_link
  - last_length
  - last_send
  - lang
  - last_error
tg_vid_queue
  - tg_user_id
  - tg_chat_id
  - tg_link
  - tg_m3u8_content
  - result
*/

function doGet() {
  var sheet = SpreadsheetApp.openById("xxx").getSheetByName("tg_vid_queue");
  var data = sheet.getRange(2,1,sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var jsonResp = [];
  data.forEach(function(row) {
    if(row[4] == 'ready') {
      jsonResp.push({
        'userId': row[0],
        'chatId': row[1],
        'link': row[2],
        'm3u8': row[3]
      });    
    }    
  });
    
  var rc = ContentService.createTextOutput(JSON.stringify(jsonResp)).setMimeType(ContentService.MimeType.JSON);    
  return rc;
  
}

function doPost(request) {
  var input = JSON.parse(request.postData.contents);
  var sheet = SpreadsheetApp.openById("xxx").getSheetByName("tg_vid_queue");  
  var rowRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(input.userId).findAll();        
  for(var i = 0; i < rowRange.length; i++) {
    if(sheet.getRange(rowRange[i].getRow(), 2).getValue() == input.chatId && sheet.getRange(rowRange[i].getRow(), 3).getValue() == input.link) {        
      sheet.getRange(rowRange[i].getRow(), 5).setValue(input.result);
    }
  }
  var rc = ContentService.createTextOutput(JSON.stringify({'result':'success'})).setMimeType(ContentService.MimeType.JSON);    
  return rc;
}

function callGateway() {
  var url = 'https://tg-bot-gateway/processVid'
  var sheet = SpreadsheetApp.openById("xxx").getSheetByName("tg_vid_queue");
  var data = sheet.getRange(2,1,sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var json = [];
  data.forEach(function(row) {
    if(row[4] == 'ready') {
      json.push({
        'userId': row[0],
        'chatId': row[1],
        'link': row[2],
        'm3u8': row[3]
      });    
    }    
  });
  
  if(json.length == 0) {    
    return;
  }
  var payload = JSON.stringify(json);
  var option = {
    'headers': {
      'Content-Type': 'application/json',            
    },
    'method': 'POST',
    'payload': payload
  };  
  var resp = UrlFetchApp.fetch(url, option);
  Logger.log('RC = ' + resp.getResponseCode() + '\n');
  Logger.log('Content = ' + resp.getContentText());
}