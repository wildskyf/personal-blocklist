// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Common functions for the Personal Blocklist Firefox Add-on.
 * @origin_author manuelh@google.com (Manuel Holtz)
 * @author wildsky@moztw.org (Geng-Zhi Fann)
 */

var blocklist = {
  common: {
    GETBLOCKLIST: 'getBlocklist',
    ADDTOBLOCKLIST: 'addToBlocklist',
    ADDBULKTOBLOCKLIST: 'addBulkToBlocklist',
    DELETEFROMBLOCKLIST: 'deleteFromBlocklist',
    FINISHEXPORT: 'finishExport',

    STRIP_WHITESPACE_REGEX: new RegExp('^\s+|\s+$', 'g'),
    HOST_REGEX: new RegExp('^https?://(www[.])?([0-9a-zA-Z.-]+).*$'),

    startBackgroundListeners: () => {
      browser.runtime.onMessage.addListener( (request, sender, sendResponse) => {
        browser.storage.sync.get().then(data => {

          if (request.type == blocklist.common.GETBLOCKLIST) {

            if (!data.blocklist) {
              var blocklistPatterns = [];
              data.blocklist = JSON.stringify(blocklistPatterns);
              browser.storage.sync.set({ blocklist: data.blocklist });
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

            if (!bls.includes(request.pattern)) {
              bls.push(request.pattern);
              bls.sort();
              data.blocklist = JSON.stringify(bls);
              browser.storage.sync.set({ blocklist: data.blocklist });
            }

            sendResponse({
              success: 1,
              pattern: request.pattern
            });
          }
          else if (request.type == blocklist.common.ADDBULKTOBLOCKLIST) {
            var bls = JSON.parse(data.blocklist);
            var countBefore = bls.length;

            request.patterns.forEach(pattern => {
              if (!bls.includes(pattern)) bls.push(pattern);
            });

            bls.sort();
            data.blocklist = JSON.stringify(bls);
            browser.storage.sync.set({ blocklist: data.blocklist });

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
              browser.storage.sync.set({ blocklist: data.blocklist });
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
            }
            else {
              isDisable = false;
            }
            // chrome.management.setEnabled(
            //     chrome.i18n.getMessage("@@extension_id"), !isDisable);
          }
        });

        return true; // async sendBack
      });
    },

    /**
     * Adds a class name to the classes of an html element.
     * @param {string} classNameString Class name string.
     * @param {string} classToAdd Single class to add to the class names.
     * @return {string} Class names string including the added class.
     */
    addClass: (classNameString, classToAdd) => {
      var classNameArray = classNameString.split(' ');
      var hasClassName = false;
      for (var className of classNameArray) {
        if (className == classToAdd) {
          hasClassName = true;
          break;
        }
      }
      if (!hasClassName) {
        classNameString += ' ' + classToAdd;
      }
      return classNameString;
    },

    /**
     * Removes a class name from the classes of an html element.
     * @param {string} classNameString Class name string.
     * @param {string} classToRemove Single class to remove from the class names.
     * @return {string} Class names string excluding the removed class.
     */
    removeClass: (classNameString, classToRemove) => {
      var reg = new RegExp('( +|^)' + classToRemove + '( +|$)', 'g');
      var newClassNameString = classNameString.replace(reg, ' ');
      newClassNameString = newClassNameString.replace(blocklist.common.STRIP_WHITESPACE_REGEX, '');
      return newClassNameString;
    },

    /**
     * Checks if a class name appears in the classes of an html element.
     * @param {string} classNameString Class name string.
     * @param {string} classToCheck Single class to check membership for.
     * @return {boolean} Is true if class appears in class names, else false.
     */
    hasClass: (classNameString, classToCheck) => {
      var classNameArray = classNameString.split(' ');
      var result = false;
      for (var className of classNameArray) {
        if (className == classToCheck) {
          result = true;
          break;
        }
      }
      return result;
    }
  }
};


browser.storage.sync.get().then(data => {

  if (data.version === undefined) {
    // still localStorage or first install

    browser.storage.sync.set({
      blocklist: "[]",
      disabled: "false"
    }).then(() => {
      localStorage.clear();
      browser.storage.sync.set({
        version: 1
      });
    });
  }

  if (data.version === 1) {
    // migrated from storage

    if (!Array.isArray(data.blocklist) && typeof data.blocklist !== "string")
      browser.storage.sync.set({ blocklist: "[]" });
    if (typeof data.disabled !== "boolean" && typeof data.disabled !== "string")
      browser.storage.sync.set({ disabled: "false" });
  }
});

document.addEventListener('DOMContentLoaded', function() {
  blocklist.common.startBackgroundListeners();
});
