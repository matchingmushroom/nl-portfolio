/**
 * Google Apps Script Web App for Nirmal Lamsal Portfolio
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet.
 * 2. Name the first sheet "Races" and set up headers in Row 1: 
 *    id | Timestamp | RaceName | Type | Participation | Distance | Time | Position | PB | Notes | Display_RaceTable | Logo
 * 3. Go to Extensions > Apps Script.
 * 4. Paste this code into Code.gs.
 * 5. Click Deploy > New deployment.
 * 6. Select type "Web app".
 * 7. Execute as: "Me", Who has access: "Anyone".
 * 8. Click Deploy, authorize permissions, and copy the "Web app URL".
 * 9. Paste the URL into `js/main.js` and `js/admin.js` in your website code.
 */

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Try "Race" first, then "Races"
  var sheet = ss.getSheetByName('Race') || ss.getSheetByName('Races');
  if (!sheet) {
    sheet = ss.insertSheet('Race');
    // Columns: id, Timestamp, RaceName, Type, Participation, Distance, Time, Position, PB, Notes, Display_RaceTable, Logo
    sheet.appendRow(['id', 'Timestamp', 'RaceName', 'Type', 'Participation', 'Distance', 'Time', 'Position', 'PB', 'Notes', 'Display_RaceTable', 'Logo']);
    sheet.getRange("A1:L1").setFontWeight("bold");
  }
  return sheet;
}

// Handle GET requests (Fetch race data or stats)
function doGet(e) {
  var action = e.parameter.action;
  
  if (action === 'stats') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      stats: calculateStats()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'blogs') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: getBlogs()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Default: Return all races
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: getRaces()
  })).setMimeType(ContentService.MimeType.JSON);
}

// Generate a simple UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Handle POST requests (Add, Update, Delete)
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || 'create';
    var data = payload.data || payload; // Fallback for older format
    
    var sheet = getOrCreateSheet();
    
    if (action === 'create') {
      var newId = generateUUID();
      var timestamp = new Date().toISOString();
      
      // Handle Logo Upload - Just save the base64 string directly!
      var finalLogoUrl = data.Logo || '';
      if (data.logoBase64) {
        finalLogoUrl = data.logoBase64;
      }
      
      sheet.appendRow([
        newId,
        timestamp,
        data.RaceName || '',
        data.Type || '',
        data.Participation || '',
        data.Distance || '',
        data.Time || '',
        data.Position || '',
        data.PB || 'No',
        data.Notes || '',
        data.Display_RaceTable || 'None',
        finalLogoUrl
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Race added successfully'
      })).setMimeType(ContentService.MimeType.JSON);
      
    } else if (action === 'update') {
      var idToUpdate = data.id;
      if (!idToUpdate) throw new Error("ID is required for update.");
      
      // Handle Logo Upload for update - Just use the base64 string
      var finalLogoUrl = data.Logo; 
      if (data.logoBase64) {
        finalLogoUrl = data.logoBase64;
      }
      
      var rows = sheet.getDataRange().getValues();
      var updated = false;
      
      // Skip header row
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === idToUpdate) {
          // Update columns (1-indexed based on sheet)
          sheet.getRange(i + 1, 3).setValue(data.RaceName || '');
          sheet.getRange(i + 1, 4).setValue(data.Type || '');
          sheet.getRange(i + 1, 5).setValue(data.Participation || '');
          sheet.getRange(i + 1, 6).setValue(data.Distance || '');
          sheet.getRange(i + 1, 7).setValue(data.Time || '');
          sheet.getRange(i + 1, 8).setValue(data.Position || '');
          sheet.getRange(i + 1, 9).setValue(data.PB || 'No');
          sheet.getRange(i + 1, 10).setValue(data.Notes || '');
          sheet.getRange(i + 1, 11).setValue(data.Display_RaceTable || 'None');
          if (finalLogoUrl !== undefined && finalLogoUrl !== null) {
              // Only update logo if a new one was uploaded or an explicit URL was provided
              if (data.logoBase64 || data.Logo !== '') {
                 sheet.getRange(i + 1, 12).setValue(finalLogoUrl);
              }
          }
          updated = true;
          break;
        }
      }
      
      if (!updated) throw new Error("Record not found.");
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Race updated successfully'
      })).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'delete') {
      var idToDelete = data.id;
      var rows = sheet.getDataRange().getValues();
      var deleted = false;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === idToDelete) {
          sheet.deleteRow(i + 1);
          deleted = true;
          break;
        }
      }
      if (!deleted) throw new Error("Race record not found.");
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Race deleted' })).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'createBlog' || action === 'updateBlog') {
      var blogSheet = getOrCreateBlogSheet();
      
      if (action === 'createBlog') {
        var newId = generateUUID();
        blogSheet.appendRow([
          newId,
          new Date().toISOString(),
          data.Title || '',
          data.ShortText || '',
          data.URL || '',
          data.Display || 'No'
        ]);
      } else {
        var idToUpdate = data.id;
        var rows = blogSheet.getDataRange().getValues();
        var updated = false;
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][0] === idToUpdate) {
            blogSheet.getRange(i + 1, 3).setValue(data.Title || '');
            blogSheet.getRange(i + 1, 4).setValue(data.ShortText || '');
            blogSheet.getRange(i + 1, 5).setValue(data.URL || '');
            blogSheet.getRange(i + 1, 6).setValue(data.Display || 'No');
            updated = true;
            break;
          }
        }
        if (!updated) throw new Error("Blog not found.");
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'deleteBlog') {
      var blogSheet = getOrCreateBlogSheet();
      var idToDelete = data.id;
      var rows = blogSheet.getDataRange().getValues();
      var deleted = false;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === idToDelete) {
          blogSheet.deleteRow(i + 1);
          deleted = true;
          break;
        }
      }
      if (!deleted) throw new Error("Blog not found.");
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'submitInquiry') {
      sendEmailNotification(data, data.type || 'contact');
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Inquiry sent' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    throw new Error("Invalid action.");
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// HELPER: Send Email Notification
function sendEmailNotification(formData, type) {
  var recipient = "team.lamsalnirmal@gmail.com";
  var subject = type === 'sponsor' ? "[Sponsorship Quest] New Partner Inquiry" : "[Contact Form] New Message from Portfolio";
  
  var body = "You have a new inquiry from your website:\n\n";
  body += "Timestamp: " + new Date().toString() + "\n";
  body += "------------------------------------------\n";
  
  for (var key in formData) {
    if (key !== 'action' && key !== 'type') {
      body += key + ": " + formData[key] + "\n";
    }
  }
  
  body += "------------------------------------------\n";
  body += "Reply directly to the sender's email provided above.";
  
  try {
    MailApp.sendEmail(recipient, subject, body);
  } catch (e) {
    Logger.log("Email failed to send: " + e.toString());
  }
}

// Helper: Get all races as array of objects
function getRaces() {
  var sheet = getOrCreateSheet();
  var data = sheet.getDataRange().getDisplayValues();
  var races = [];
  
  // Skip header row
  for (var i = 1; i < data.length; i++) {
    races.push({
      id: data[i][0] || '',
      timestamp: data[i][1] || '',
      RaceName: data[i][2] || '',
      Type: data[i][3] || '',
      Participation: data[i][4] || '',
      Distance: data[i][5] || '',
      Time: data[i][6] || '',
      Position: data[i][7] || '',
      PB: data[i][8] || '',
      Notes: data[i][9] || '',
      Display_RaceTable: data[i][10] || 'None',
      Logo: data[i][11] || ''
    });
  }
  
  return races;
}

// Helper: Calculate stats
function calculateStats() {
  var races = getRaces();
  var totalRaces = races.length;
  var pb = '--:--:--';
  
  if (totalRaces > 0) {
    // Simple sort to find best time (assuming format HH:MM:SS)
    var times = races.map(function(r) { return r.Time; }).filter(function(t) { return t; });
    if (times.length > 0) {
      times.sort();
      pb = times[0];
    }
  }
  
  return {
    totalRaces: totalRaces,
    personalBest: pb
  };
}

// Helper: Format Date
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    var d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString; // fallback if not a date
    var options = { year: 'numeric', month: 'short', day: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  } catch (e) {
    return dateString;
  }
}

// Helper: Get all blogs
function getBlogs() {
  var sheet = getOrCreateBlogSheet();
  var data = sheet.getDataRange().getDisplayValues();
  var blogs = [];
  for (var i = 1; i < data.length; i++) {
    blogs.push({
      id: data[i][0] || '',
      Timestamp: data[i][1] || '',
      Title: data[i][2] || '',
      ShortText: data[i][3] || '',
      URL: data[i][4] || '',
      Display: data[i][5] || 'No'
    });
  }
  return blogs;
}

// Helper: Get or create Blog sheet
function getOrCreateBlogSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Blog');
  if (!sheet) {
    sheet = ss.insertSheet('Blog');
    sheet.appendRow(['id', 'Timestamp', 'Title', 'ShortText', 'URL', 'Display']);
    sheet.getRange("A1:F1").setFontWeight("bold");
  }
  return sheet;
}

}
