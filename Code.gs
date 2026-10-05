/**
 * ================================================================================================
 * 🗳️ राजस्थान राज्य निर्वाचन आयोग - पंचायत आम चुनाव 2026
 * कार्यालय उपखंड मजिस्ट्रेट (SDM), भिनाय (अजमेर)
 * Master Google Apps Script Web App Backend (Code.gs)
 * ================================================================================================
 * 
 * Features:
 *   1. doGet(e) - REST API for Web Portal:
 *      - action=ping : Test connection
 *      - action=login : Authenticate user & return permissions
 *      - action=getUsers : Super Admin user list
 *      - action=getPanchayats : List of 30 Panchayats & Wards
 *      - action=getVoters : Active voters (excludes deleted) by Panchayat & Ward
 *      - action=getDeletedVoters : Deleted voters list (घटक 2) with reasons & codes
 *      - action=searchVoters : Fast search across active voters
 * 
 *   2. doPost(e) - Super Admin Management API:
 *      - action=updatePassword : Directly change any user's password in Google Sheet
 *      - action=addUser : Add new user with credentials, role, panchayat & ward control
 *      - action=toggleUserStatus : Activate or Deactivate any user in Google Sheet
 *      - action=updateUserScope : Assign specific Panchayats & Wards to a user
 * 
 *   3. Deployment Instructions:
 *      - Open Google Sheet > Extensions > Apps Script
 *      - Paste this Code.gs
 *      - Click 'Deploy' > 'New deployment' > Select type: 'Web app'
 *      - Execute as: 'Me' (your account)
 *      - Who has access: 'Anyone'
 *      - Copy the Web App URL and paste it into the Voter Portal Settings
 * ================================================================================================
 */

// Global Sheet Tab Names
var SHEET_USERS = "Users";
var SHEET_VOTERS = "Voters";
var SHEET_DELETED = "Deleted_Voters";
var SHEET_SUMMARY = "Summary";

/**
 * Standard HTTP GET Handler
 */
function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var action = params.action || "ping";
  var callback = params.callback; // For JSONP if needed

  var responseData = {};

  try {
    switch (action) {
      case "ping":
        responseData = {
          success: true,
          message: "Panchayat Election 2026 API is Live!",
          timestamp: new Date().toISOString()
        };
        break;

      case "login":
        responseData = handleLogin(params.username, params.password);
        break;

      case "getUsers":
        responseData = handleGetUsers(params.adminUsername, params.adminPassword);
        break;

      case "getPanchayats":
        responseData = handleGetPanchayats();
        break;

      case "getVoters":
        responseData = handleGetVoters(params.panchayat, params.ward, params.page, params.limit);
        break;

      case "getDeletedVoters":
        responseData = handleGetDeletedVoters(params.panchayat, params.ward);
        break;

      case "searchVoters":
        responseData = handleSearchVoters(params.q, params.panchayat, params.ward);
        break;

      default:
        responseData = {
          success: false,
          error: "अमान्य Action: " + action
        };
    }
  } catch (err) {
    responseData = {
      success: false,
      error: err.toString()
    };
  }

  return createJsonResponse(responseData, callback);
}

/**
 * Standard HTTP POST Handler (Super Admin Operations)
 */
function doPost(e) {
  var responseData = {};

  try {
    var payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (ex) {
        payload = e.parameter || {};
      }
    } else {
      payload = e.parameter || {};
    }

    var action = payload.action || "";

    switch (action) {
      case "updatePassword":
        responseData = handleUpdatePassword(payload.username, payload.newPassword, payload.adminUsername);
        break;

      case "addUser":
        responseData = handleAddUser(payload.userData, payload.adminUsername);
        break;

      case "toggleUserStatus":
        responseData = handleToggleUserStatus(payload.username, payload.status, payload.adminUsername);
        break;

      case "updateUserScope":
        responseData = handleUpdateUserScope(payload.username, payload.assignedPanchayats, payload.assignedWards, payload.adminUsername);
        break;

      default:
        responseData = {
          success: false,
          error: "अमान्य POST Action: " + action
        };
    }
  } catch (err) {
    responseData = {
      success: false,
      error: err.toString()
    };
  }

  return createJsonResponse(responseData);
}

// ================================================================================================
// API HANDLER FUNCTIONS
// ================================================================================================

/**
 * Handle User Login
 */
function handleLogin(username, password) {
  if (!username || !password) {
    return { success: false, error: "यूजरनेम एवं पासवर्ड आवश्यक हैं!" };
  }

  var sheet = getOrCreateSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: false, error: "Users शीट में कोई रिकॉर्ड उपलब्ध नहीं है!" };
  }

  var headers = data[0];
  var uCol = headers.indexOf("Username");
  var pCol = headers.indexOf("Password");
  var nCol = headers.indexOf("Full_Name");
  var mCol = headers.indexOf("Mobile");
  var rCol = headers.indexOf("Role");
  var gpCol = headers.indexOf("Assigned_Panchayats");
  var wCol = headers.indexOf("Assigned_Wards");
  var sCol = headers.indexOf("Status");

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var u = String(row[uCol] || "").trim().toLowerCase();
    var p = String(row[pCol] || "").trim();

    if (u === String(username).trim().toLowerCase()) {
      if (p !== String(password).trim()) {
        return { success: false, error: "गलत पासवर्ड! कृपया पुनः प्रयास करें।" };
      }

      var status = sCol !== -1 ? String(row[sCol] || "ACTIVE").trim().toUpperCase() : "ACTIVE";
      if (status === "INACTIVE" || status === "DEACTIVE" || status === "निष्क्रिय") {
        return { success: false, error: "यह खाता निष्क्रिय (Deactivated) है! कृपया सुपर एडमिन से संपर्क करें।" };
      }

      return {
        success: true,
        user: {
          username: row[uCol],
          fullName: nCol !== -1 ? row[nCol] : row[uCol],
          mobile: mCol !== -1 ? row[mCol] : "",
          role: rCol !== -1 ? row[rCol] : "PANCHAYAT_AGENT",
          assignedPanchayats: gpCol !== -1 ? String(row[gpCol] || "ALL").trim() : "ALL",
          assignedWards: wCol !== -1 ? String(row[wCol] || "ALL").trim() : "ALL",
          status: status
        }
      };
    }
  }

  return { success: false, error: "उपयोगकर्ता (Username) नहीं मिला!" };
}

/**
 * Handle Get Users (Super Admin Dashboard)
 */
function handleGetUsers(adminUsername, adminPassword) {
  var sheet = getOrCreateSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, users: [] };

  var headers = data[0];
  var uCol = headers.indexOf("Username");
  var pCol = headers.indexOf("Password");
  var nCol = headers.indexOf("Full_Name");
  var mCol = headers.indexOf("Mobile");
  var rCol = headers.indexOf("Role");
  var gpCol = headers.indexOf("Assigned_Panchayats");
  var wCol = headers.indexOf("Assigned_Wards");
  var sCol = headers.indexOf("Status");
  var cCol = headers.indexOf("Created_At");

  var users = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[uCol]) continue;
    users.push({
      rowIndex: i + 1,
      username: String(row[uCol]),
      password: String(row[pCol] || ""), // Returned for Super Admin editing
      fullName: nCol !== -1 ? String(row[nCol] || "") : "",
      mobile: mCol !== -1 ? String(row[mCol] || "") : "",
      role: rCol !== -1 ? String(row[rCol] || "PANCHAYAT_AGENT") : "PANCHAYAT_AGENT",
      assignedPanchayats: gpCol !== -1 ? String(row[gpCol] || "ALL") : "ALL",
      assignedWards: wCol !== -1 ? String(row[wCol] || "ALL") : "ALL",
      status: sCol !== -1 ? String(row[sCol] || "ACTIVE").toUpperCase() : "ACTIVE",
      createdAt: cCol !== -1 ? String(row[cCol] || "") : ""
    });
  }

  return { success: true, users: users };
}

/**
 * Handle Update Password (POST)
 */
function handleUpdatePassword(username, newPassword, adminUsername) {
  if (!username || !newPassword) {
    return { success: false, error: "Username और New Password आवश्यक हैं!" };
  }

  var sheet = getOrCreateSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  var uCol = data[0].indexOf("Username");
  var pCol = data[0].indexOf("Password");

  if (uCol === -1 || pCol === -1) {
    return { success: false, error: "Users शीट में आवश्यक कॉलम नहीं मिले!" };
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][uCol]).trim().toLowerCase() === String(username).trim().toLowerCase()) {
      sheet.getRange(i + 1, pCol + 1).setValue(String(newPassword).trim());
      SpreadsheetApp.flush();
      return {
        success: true,
        message: username + " का पासवर्ड सफलतापूर्वक बदल दिया गया है!"
      };
    }
  }

  return { success: false, error: "उपयोगकर्ता " + username + " नहीं मिला!" };
}

/**
 * Handle Add New User (POST)
 */
function handleAddUser(userData, adminUsername) {
  if (!userData || !userData.username || !userData.password) {
    return { success: false, error: "यूजरनेम एवं पासवर्ड आवश्यक हैं!" };
  }

  var sheet = getOrCreateSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var uCol = headers.indexOf("Username");

  // Check if username already exists
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][uCol]).trim().toLowerCase() === String(userData.username).trim().toLowerCase()) {
      return { success: false, error: "यह Username (" + userData.username + ") पहले से मौजूद है!" };
    }
  }

  var newRow = [
    String(userData.username).trim(),
    String(userData.password).trim(),
    String(userData.fullName || userData.username).trim(),
    String(userData.mobile || "").trim(),
    String(userData.role || "PANCHAYAT_AGENT").trim().toUpperCase(),
    String(userData.assignedPanchayats || "ALL").trim(),
    String(userData.assignedWards || "ALL").trim(),
    String(userData.status || "ACTIVE").trim().toUpperCase(),
    Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss")
  ];

  sheet.appendRow(newRow);
  SpreadsheetApp.flush();

  return {
    success: true,
    message: "नया यूजर (" + userData.username + ") सफलतापूर्वक जोड़ा गया!"
  };
}

/**
 * Handle Toggle User Status (ACTIVE / INACTIVE) (POST)
 */
function handleToggleUserStatus(username, status, adminUsername) {
  if (!username) return { success: false, error: "Username आवश्यक है!" };

  var sheet = getOrCreateSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  var uCol = data[0].indexOf("Username");
  var sCol = data[0].indexOf("Status");

  if (uCol === -1 || sCol === -1) {
    return { success: false, error: "Status कॉलम नहीं मिला!" };
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][uCol]).trim().toLowerCase() === String(username).trim().toLowerCase()) {
      var newStatus = String(status || (data[i][sCol] === "ACTIVE" ? "INACTIVE" : "ACTIVE")).toUpperCase();
      sheet.getRange(i + 1, sCol + 1).setValue(newStatus);
      SpreadsheetApp.flush();
      return {
        success: true,
        message: username + " की स्थिति को " + newStatus + " कर दिया गया है!",
        newStatus: newStatus
      };
    }
  }

  return { success: false, error: "उपयोगकर्ता नहीं मिला!" };
}

/**
 * Handle Update User Scope (Assigned Panchayats & Wards) (POST)
 */
function handleUpdateUserScope(username, assignedPanchayats, assignedWards, adminUsername) {
  if (!username) return { success: false, error: "Username आवश्यक है!" };

  var sheet = getOrCreateSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  var uCol = data[0].indexOf("Username");
  var gpCol = data[0].indexOf("Assigned_Panchayats");
  var wCol = data[0].indexOf("Assigned_Wards");

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][uCol]).trim().toLowerCase() === String(username).trim().toLowerCase()) {
      if (gpCol !== -1 && assignedPanchayats !== undefined) {
        sheet.getRange(i + 1, gpCol + 1).setValue(String(assignedPanchayats));
      }
      if (wCol !== -1 && assignedWards !== undefined) {
        sheet.getRange(i + 1, wCol + 1).setValue(String(assignedWards));
      }
      SpreadsheetApp.flush();
      return {
        success: true,
        message: username + " के अधिकार (Panchayats/Wards) अपडेट कर दिए गए हैं!"
      };
    }
  }

  return { success: false, error: "उपयोगकर्ता नहीं मिला!" };
}

/**
 * Handle Get Panchayats List
 */
function handleGetPanchayats() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SUMMARY);
  if (!sheet) {
    // Generate dynamically from Voters sheet
    return getDynamicPanchayats();
  }

  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push({
      name_en: data[i][0],
      name_hi: data[i][1],
      total_wards: Number(data[i][2]),
      ward_range: String(data[i][3]),
      active_voters: Number(data[i][4]),
      deleted_voters: Number(data[i][5]),
      total_voters: Number(data[i][6])
    });
  }
  return { success: true, panchayats: list };
}

/**
 * Handle Get Active Voters (Excludes Deleted Voters)
 */
function handleGetVoters(panchayat, ward, page, limit) {
  var sheet = getOrCreateSheet(SHEET_VOTERS);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, voters: [], total: 0 };

  var p = (panchayat || "").trim().toLowerCase();
  var w = ward ? String(ward).trim() : "";
  var pageNum = Math.max(1, parseInt(page, 10) || 1);
  var pageSize = Math.min(500, Math.max(10, parseInt(limit, 10) || 100));

  var filtered = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // Exclude deleted voters
    var status = String(row[11] || "सक्रिय").trim();
    if (status === "निरस्त") continue;

    var rowGpEn = String(row[0] || "").trim().toLowerCase();
    var rowGpHi = String(row[1] || "").trim().toLowerCase();
    var rowWard = String(row[2] || "").trim();

    if (p && rowGpEn !== p && rowGpHi !== p) continue;
    if (w && rowWard !== w) continue;

    filtered.push(formatVoterObject(row));
  }

  var total = filtered.length;
  var start = (pageNum - 1) * pageSize;
  var pageItems = filtered.slice(start, start + pageSize);

  return {
    success: true,
    voters: pageItems,
    total: total,
    page: pageNum,
    pageSize: pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

/**
 * Handle Get Deleted Voters List (Dedicated विलोपन सूची)
 */
function handleGetDeletedVoters(panchayat, ward) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_DELETED);
  if (!sheet) {
    sheet = getOrCreateSheet(SHEET_VOTERS);
  }

  var data = sheet.getDataRange().getValues();
  var p = (panchayat || "").trim().toLowerCase();
  var w = ward ? String(ward).trim() : "";

  var deletedList = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var status = String(row[11] || "").trim();
    if (status !== "निरस्त" && sheet.getName() === SHEET_VOTERS) continue;

    var rowGpEn = String(row[0] || "").trim().toLowerCase();
    var rowGpHi = String(row[1] || "").trim().toLowerCase();
    var rowWard = String(row[2] || "").trim();

    if (p && rowGpEn !== p && rowGpHi !== p) continue;
    if (w && rowWard !== w) continue;

    deletedList.push({
      panchayat_en: row[0],
      gram_panchayat: row[1],
      ward_no: row[2],
      serial_no: row[3],
      epic_no: row[4],
      voter_name: row[5],
      relative_name: row[6],
      relative_relation: row[7],
      house_no: row[8],
      age: row[9],
      gender: row[10],
      status: "निरस्त",
      deletion_code: row[12] || "",
      deletion_reason: row[13] || "विलोपित"
    });
  }

  return {
    success: true,
    deletedVoters: deletedList,
    total: deletedList.length
  };
}

/**
 * Handle Search Across Active Voters
 */
function handleSearchVoters(query, panchayat, ward) {
  if (!query || query.trim().length === 0) {
    return { success: true, voters: [], total: 0 };
  }

  var sheet = getOrCreateSheet(SHEET_VOTERS);
  var data = sheet.getDataRange().getValues();
  var q = query.trim().toLowerCase();
  var p = (panchayat || "").trim().toLowerCase();
  var w = ward ? String(ward).trim() : "";

  var matches = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // Exclude deleted voters
    var status = String(row[11] || "सक्रिय").trim();
    if (status === "निरस्त") continue;

    var rowGpEn = String(row[0] || "").trim().toLowerCase();
    var rowGpHi = String(row[1] || "").trim().toLowerCase();
    var rowWard = String(row[2] || "").trim();

    if (p && rowGpEn !== p && rowGpHi !== p) continue;
    if (w && rowWard !== w) continue;

    var name = String(row[5] || "").toLowerCase();
    var rel = String(row[6] || "").toLowerCase();
    var epic = String(row[4] || "").toLowerCase();
    var house = String(row[8] || "").toLowerCase();
    var serial = String(row[3] || "").toLowerCase();

    if (name.indexOf(q) !== -1 || rel.indexOf(q) !== -1 || epic.indexOf(q) !== -1 || house === q || serial === q) {
      matches.push(formatVoterObject(row));
      if (matches.length >= 200) break; // Limit search results to 200 for fast response
    }
  }

  return {
    success: true,
    voters: matches,
    total: matches.length
  };
}

// ================================================================================================
// HELPER FUNCTIONS
// ================================================================================================

function formatVoterObject(row) {
  return {
    panchayat_en: row[0],
    gram_panchayat: row[1],
    ward_no: row[2],
    serial_no: row[3],
    epic_no: row[4],
    voter_name: row[5],
    relative_name: row[6],
    relative_relation: row[7],
    house_no: row[8],
    age: row[9],
    gender: row[10],
    status: row[11] || "सक्रिय",
    photo_url: "https://api.dicebear.com/7.x/identicon/svg?seed=" + encodeURIComponent(row[4] || row[3]) // Fallback dynamic photo
  };
}

function getOrCreateSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function createJsonResponse(data, callback) {
  var output = JSON.stringify(data);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + output + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}
