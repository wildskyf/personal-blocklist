// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Common functions for the Personal Blocklist Chrome extension.
 * @author manuelh@google.com (Manuel Holtz)
 */

/**
 * The oi ("onebox information") tag that identifies 204s as Site blocker.
 * @type {string}
 */
var BLOCKER_OI = 'site_blocker';

var blocklist = {};

/**
 * Namespace for common functions of the Blocklist Chrome extension.
 * @const
 */
blocklist.common = {};

blocklist.common.GETBLOCKLIST = 'getBlocklist';
blocklist.common.ADDTOBLOCKLIST = 'addToBlocklist';
blocklist.common.ADDBULKTOBLOCKLIST = 'addBulkToBlocklist';
blocklist.common.DELETEFROMBLOCKLIST = 'deleteFromBlocklist';
blocklist.common.FINISHEXPORT = 'finishExport';

/**
 * Batch size for logging bulk added patterns to gen_204.
 * @type {int}
 */
blocklist.common.LOG_BATCH_SIZE = 10;

/**
 * Regular expression to strip whitespace.
 * @type {RegExp}
 */
blocklist.common.STRIP_WHITESPACE_REGEX = new RegExp('^\s+|\s+$', 'g');

/**
 * A regular expression to find the host for a url.
 * @type {RegExp}
 */
blocklist.common.HOST_REGEX = new RegExp(
    '^https?://(www[.])?([0-9a-zA-Z.-]+).*$');

/**
 * Logs an action by sending an XHR to www.google.com/gen_204.
 * The logging action may in the form of:
 * block/release [site].
 * @param {Object} request The detail request containing site and search event
 * id.
 * @private
 */
blocklist.common.logAction_ = function(request) {
  // TODO: add option for users to decide
  // whether they want to send data to google
  // current early return first
  return;

  /**
   * The URL and path to the gen_204 GWS endpoint.
   * @type {string}
   */

  // var GEN_204_URL = 'http://www.google.com/gen_204?';

  // var site = request.pattern;
  // var eid = request.ei;
  // var action = request.type;
  // // Ignore logging when user is under https search result page.
  // if (request.enc) {
  //   return;
  // }
  // var args = [
  //     'atyp=i',
  //     'oi=' + BLOCKER_OI,
  //     'ct=' + action,
  //     'ei=' + eid,
  //     'cad=' + encodeURIComponent(site)
  //         ];
  // var url = GEN_204_URL + args.join('&');
  // try {
  //   var xhr = new XMLHttpRequest();
  //   xhr.open('GET', url, true /* async */);
  //   xhr.send();
  // } catch (e) {
  //   // Unable to send XHR.
  // }
};

/****
 * Storage Managing
 * migrate data from localStorage to browser.storage
 */

browser.storage.sync.get().then(data => {
  if (data.version === undefined) {
    // still localStorage
    browser.storage.sync.set({
      disabled: localStorage.disabled,
      blocklist: localStorage.blocklist
    }).then(() => {
      localStorage.clear();
      browser.storage.sync.set({
        version: 1
      });
    })
  }
});

/**
 * Provides read & write access to local storage for content scripts.
 */
blocklist.common.startBackgroundListeners = () => {
  browser.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    browser.storage.sync.get().then(data => {

      if (request.type == blocklist.common.GETBLOCKLIST) {

        if (!data.blocklist) {
          var blocklistPatterns = [];
          data.blocklist = JSON.stringify(blocklistPatterns);
        }
        else {
          var blocklistPatterns = JSON.parse(data.blocklist);
        }

        var resultPatterns = [];
        if (request.num != undefined && request.num > 0) {
          resultPatterns = blocklistPatterns.slice(request.start, request.start + request.num);
        }
        else {
          resultPatterns = blocklistPatterns;
        }

        resultPatterns.sort();

        sendResponse({
          blocklist: resultPatterns,
          start: request.start,
          num: request.num,
          total: blocklistPatterns.length
        });
      }
      else if (request.type == blocklist.common.ADDTOBLOCKLIST) {
        var bls = JSON.parse(data.blocklist);
        if (bls.indexOf(request.pattern) == -1) {
          bls.push(request.pattern);
          bls.sort();
          data.blocklist = JSON.stringify(bls);
          blocklist.common.logAction_(request);
        }
        sendResponse({
          success: 1,
          pattern: request.pattern
        });
      }
      else if (request.type == blocklist.common.ADDBULKTOBLOCKLIST) {
        var bls = JSON.parse(data.blocklist);
        var countBefore = bls.length;
        var log_patterns = new Array();

        request.patterns.forEach(pattern => {

          if (bls.indexOf(pattern) == -1) {
            bls.push(pattern);
            log_patterns.push(patterns);
          }

          // Log to gen_204 in batches of 10 patterns.
          if (log_patterns.length >= blocklist.common.LOG_BATCH_SIZE) {
            request.pattern = log_patterns.join('|');
            blocklist.common.logAction_(request);
            log_patterns = new Array();
          }

        });

        if (log_patterns.length > 0) {
          request.pattern = log_patterns.join('|');
          blocklist.common.logAction_(request);
        }
        bls.sort();
        data.blocklist = JSON.stringify(bls);
        sendResponse({
          success: 1,
          count: bls.length - countBefore
        });
      }
      else if (request.type == blocklist.common.DELETEFROMBLOCKLIST) {
        var bls = JSON.parse(data.blocklist);
        var index = bls.indexOf(request.pattern);
        if (index != -1) {
          bls.splice(index, 1);
          data.blocklist = JSON.stringify(bls);
          blocklist.common.logAction_(request);
        }
        sendResponse({
          success: 1,
          pattern: request.pattern
        });
      }
      else if (request.type == blocklist.common.FINISHEXPORT) {
        var isDisable = true;
        if (data.disabled == 'true') {
          isDisable = true;
        } else {
          isDisable = false;
        }
        // chrome.management.setEnabled(
        //     chrome.i18n.getMessage("@@extension_id"), !isDisable);
      }

      browser.storage.sync.set(data);
    });

    return true; // async sendBack
  });
};

/**
 * Adds a class name to the classes of an html element.
 * @param {string} classNameString Class name string.
 * @param {string} classToAdd Single class to add to the class names.
 * @return {string} Class names string including the added class.
 */
blocklist.common.addClass = function(classNameString, classToAdd) {
  var classNameArray = classNameString.split(' ');
  var hasClassName = false;
  for (var i = 0; i < classNameArray.length; i++) {
    if (classNameArray[i] == classToAdd) {
      hasClassName = true;
      break;
    }
  }
  if (!hasClassName) {
    classNameString += ' ' + classToAdd;
  }
  return classNameString;
};

/**
 * Removes a class name from the classes of an html element.
 * @param {string} classNameString Class name string.
 * @param {string} classToRemove Single class to remove from the class names.
 * @return {string} Class names string excluding the removed class.
 */
blocklist.common.removeClass = function(classNameString, classToRemove) {
  var reg = new RegExp('( +|^)' + classToRemove + '( +|$)', 'g');
  var newClassNameString = classNameString.replace(reg, ' ');
  newClassNameString = newClassNameString.replace(
      blocklist.common.STRIP_WHITESPACE_REGEX, '');
  return newClassNameString;
};

/**
 * Checks if a class name appears in the classes of an html element.
 * @param {string} classNameString Class name string.
 * @param {string} classToCheck Single class to check membership for.
 * @return {boolean} Is true if class appears in class names, else false.
 */
blocklist.common.hasClass = function(classNameString, classToCheck) {
  var classNameArray = classNameString.split(' ');
  var result = false;
  for (var i = 0; i < classNameArray.length; i++) {
    if (classNameArray[i] == classToCheck) {
      result = true;
      break;
    }
  }
  return result;
};


document.addEventListener('DOMContentLoaded', function() {
  blocklist.common.startBackgroundListeners();
});
