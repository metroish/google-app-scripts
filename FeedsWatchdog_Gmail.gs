function feedsWatchdog() {

  var sheet = SpreadsheetApp.openById("xxx").getSheetByName("Feeds");
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var mailBody = '';

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
      var resp = UrlFetchApp.fetch(data[i][1], {
        'headers': {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:85.0) Gecko/20100101 Firefox/85.0'          
        },
        'method': 'get'        
      });
    } catch (e) {
      // record error message on Feed_Last_Error_Msg
      var nowDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
      sheet.getRange(i + 2, 5).setValue('[' + nowDate + '] ' + e);
      continue;
    }

    if (resp.getResponseCode() == 200) {
      Logger.log(resp.getContentText());
      //var doc = XmlService.parse(resp.getContentText()).getRootElement();
      var doc = XmlService.parse(resp.getContentText().replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g,'')).getRootElement();

      // content change, need to send notify      
      if (resp.getContentText().length != data[i][2]) {
        var items = doc.getChild('channel').getChildren('item');
        mailBody += '\n【' + data[i][0] + '】\n';

        // handle each article in rss feed
        for (var j = 0; j < items.length; j++) {
          var pubDate = new Date(items[j].getChildText('pubDate')).toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
          if (Date.parse(pubDate).valueOf() > Date.parse(data[i][3]).valueOf()) {
            var title = items[j].getChildText('title');
            var link = items[j].getChildText('link');
            // var description = items[j].getChildText('description');
            // mailBody += title + '\n' + description + '\n' + link + '\n';
            mailBody += title + '\n' + link + '\n';
          }
        }
        var lastSend = new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
        sheet.getRange(i + 2, 4).setValue(lastSend);
        sheet.getRange(i + 2, 3).setValue(resp.getContentText().length);
      }
    }
  }

  if (mailBody != '') {
    var lastSend = new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
    MailApp.sendEmail("@gmail.com", "【RSS Sources Report】- " + lastSend, mailBody);
  }
}
