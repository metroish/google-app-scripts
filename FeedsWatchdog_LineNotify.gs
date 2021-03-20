/*
spreadsheet:
  - Feeds

column:
  - Feed_Title	
  - Feed_Link	
  - Feed_Last_Length	
  - Feed_Last_Send_Date	
  - Feed_Last_Error_Msg
*/

function feedsWatchdog_LineNotify() {

  var sheet = SpreadsheetApp.openById("xxx").getSheetByName("Feeds");
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();  

  // handle each row setting
  for (var i = 0; i < data.length; i++) {

    // 1st initial if Feed_Last_Length & Feed_Last_Send_Date are empty
    if (data[i][2] == '' && data[i][3] == '') {
      sheet.getRange(i + 2, 3).setValue(0); // set length of rss feed to 0
      sheet.getRange(i + 2, 4).setValue(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' })); // set current time as last send date
      continue;
    }

    // get rss feed content
    try {
      var resp = UrlFetchApp.fetch(data[i][1]);
    } catch (e) {
      // record error message on Feed_Last_Error_Msg
      var nowDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
      sheet.getRange(i + 2, 5).setValue('[' + nowDate + '] ' + e);      
      continue;
    }

    if (resp.getResponseCode() == 200) {
      var doc = XmlService.parse(resp.getContentText()).getRootElement();

      // content change, need to send notify      
      if (resp.getContentText().length != data[i][2]) {
        var items = doc.getChild('channel').getChildren('item');
        var lastSend = '';
        var allDone = true;        

        // handle each article in rss feed
        for (var j = 0; j < items.length; j++) {
          var pubDate = new Date(items[j].getChildText('pubDate')).toLocaleString('en-US', { timeZone: 'Asia/Taipei' });                    
          if (Date.parse(pubDate).valueOf() > Date.parse(data[i][3]).valueOf()) {
            var title = items[j].getChildText('title');
            var link = items[j].getChildText('link');
            try {
              var lineResp = UrlFetchApp.fetch("https://notify-api.line.me/api/notify", {
                'headers': {
                  'Authorization': 'Bearer XXXXXXX(replace by token)',
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                'method': 'post',
                'payload': {
                  'message': title + '\n' + link
                }
              });
              if (lineResp.getResponseCode() == 200) {
                lastSend = new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
              }
            } catch (e) {
              var nowDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
              sheet.getRange(i + 2, 5).setValue('[' + nowDate + '] [' + title + '] [' + link + '] post to line notify fail. ' + e);
              allDone = false;
              break;
            }
          }
        }
        if (lastSend != '') {
          sheet.getRange(i + 2, 4).setValue(lastSend);
        }
        if (allDone) {
          sheet.getRange(i + 2, 3).setValue(resp.getContentText().length);
        }
      }
    }
  }
}