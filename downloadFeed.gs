function downloadFeed() {
  var fileName = ""
  var fileSize = ""
  
  var result = UrlFetchApp.fetch("url");
  var rc = result.getResponseCode()
  
  if(rc == 200) {
    var fileText = result.getContentText()
    var folder = DriveApp.getFolderById("xxx")
    var oldFile = DriveApp.getFilesByName("xxx")
    while (oldFile.hasNext()) {
      var temp = oldFile.next()
      if(new Date() - temp.getLastUpdated() > 0) {
        temp.setTrashed(true)
      }
    }
    if(folder != null) {
      var file = folder.createFile("xxx", fileText)
      fileName = file.getName()
      fileSize = file.getSize()      
    }
  }
  
  var fileInfo = {'rc':rc, 'fileName':fileName, 'fileSize':fileSize}
  Logger.log(fileInfo)    
}