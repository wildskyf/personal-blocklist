// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Google search result page pattern blocking management
 * functionalities.
 * @author zhonglei@google.com (Ray Zhong)
 */

/**
 * Namespace for the blocklist management.
 * @const
 */
blocklist.manager = {};

/**
 * Number of blocklist item fetched each time.
 * @type {Num}
 */
blocklist.manager.BL_NUM = 20;

/**
 * Regular expression to validate host/domain pattern.
 * @type {RegExp}
 */
blocklist.manager.VALID_HOST_REGEX =
    new RegExp('^([^.:;/*!?\'\" ()#$@<>]+[.])+[^.:;/*!?\'\" ()#$@<>]{2,4}$');

/**
 * Trim text which is too long to fit in the element. Use title to show complete
 * text.
 * @param {Object} element The element where the text shows.
 * @param {string} text The text to show.
 * @param {Num} length The length limitation for the text.
 * @private
 */
blocklist.manager.showLongInfo_ = function(element, text, length) {
  if (text && element) {
    if (text.length > length) {
      var subText = text.substring(0, length) + '...';
      element.text(subText);
      element.attr('title', text);
    } else {
      element.text(text);
    }
  }
};

/**
 * Extract main domain from pattern.
 * @param {string} pattern The pattern where domain is extracted from.
 * @return {string} Main domain.
 * @private
 */
blocklist.manager.extractDomain_ = function(pattern) {
  // Matches the longest suffix against the tld list.
  var parts = pattern.split('.');
  for (var i = 0; i < parts.length; ++i) {
    var dm = parts.slice(i).join('.');
    if (blocklist.TLD_LIST.indexOf(dm) != -1) {
      return parts.slice(i - 1).join('.');
    }
  }
  // Not found, just return the whole pattern.
  return pattern;
};

/**
 * Basic check and correction of the subdomain.
 * @param {string} subdomain The subdomain to be checked and corrected.
 * @return {string} The corrected subdomain.
 * @private
 */
blocklist.manager.uniformSubDomain_ = function(subdomain) {
  // Trim left and right spaces and '.',
  // replace continues '.' with single '.'
  return subdomain.trim()
      .replace(/^\.+|\.+$/g, '')
      .replace(/\.+/g, '.');
};

/**
 * Assembles pattern with subdomain and domain.
 * @param {string} subdomain The subdomain part.
 * @param {string} domain The domain part.
 * @return {string} The assembled pattern.
 * @private
 */
blocklist.manager.assemblePattern_ = function(subdomain, domain) {
  var sd = blocklist.manager.uniformSubDomain_(subdomain);
  var res = sd ? sd + '.' + domain : domain;
  return res;
};

/**
 * Create an editable blocklist url pattern.
 * @param {string} pattern The url pattern to blocklist.
 * @return {Element} A tr element with the pattern and operation.
 */
blocklist.manager.createBlocklistPattern = function(pattern) {
  // Constructs layout.
  var patRow = $('<tr></tr>');
  var operTd = $('<td style="text-align:center"></td>')
                .appendTo(patRow);

  var deleteBtn = $('<a href="javascript:;" class="manager-btn"></a>')
      .appendTo(operTd);

  var patTd = $('<td></td>').appendTo(patRow);
  var patShowDiv = $('<div></div>').appendTo(patTd);
  var patPreSub = $('<input type="hidden" />').appendTo(patShowDiv);
  var patPreDom = $('<input type="hidden" />').appendTo(patShowDiv);

  var patEditTable = $('<table class="manager-edit-table">' +
                       '<col width=50%><col width=30%><col width=20%>' +
                       '</table>').appendTo(patTd);
  var patEditRow = $('<tr></tr>').appendTo(patEditTable);
  var patEditTd = $('<td></td>').appendTo(patEditRow);
  var patDomainTd = $('<td></td>').appendTo(patEditRow);
  var patBtnTd = $('<td style="text-align:right"></td>').appendTo(patEditRow);

  // Dive the pattern into subdomain and domain parts.

  // Initialize values.
  blocklist.manager.showLongInfo_(patShowDiv, pattern, 60);
  patEditTable.hide();

  var domain = blocklist.manager.extractDomain_(pattern);
  var subDomain = pattern.substring(0, pattern.indexOf(domain));
  patPreSub.val(subDomain);
  patPreDom.val(domain);

  deleteBtn.text(chrome.i18n.getMessage('unblock'));


  // Manual edit patterns, only subdomains` part is available for editing.
  // For example, if the pattern is a.b.c.d. Assuming d is TLD, then a.b is
  // editable.

  var editBtn = $('<a href="javascript:;" class="manager-btn"></a>')
      .appendTo(operTd);
  var patEditInput = $('<input class="pat-edit-input-text" type="text" />')
        .appendTo(patEditTd);
  var domainPart = $('<span></span>').appendTo(patDomainTd);
  var patEditInputOK = $('<button class="manager-btn"></button>')
        .appendTo(patBtnTd);
  var patEditInputCancel =
      $('<button class="manager-btn"></button>')
        .appendTo(patBtnTd);
  editBtn.text(chrome.i18n.getMessage('edit'));
  patEditInputOK.text(chrome.i18n.getMessage('ok'));
  patEditInputCancel.text(chrome.i18n.getMessage('cancel'));

  blocklist.manager.showLongInfo_(domainPart, '.' + domain, 20);
  patEditInput.val(subDomain);
  // Change to manual edit mode.
  editBtn.click(function() {
    patShowDiv.hide();
    patEditTable.show();
    patEditInput.select();
  });

  // Bind events.
  deleteBtn.click(function() {
    // Delete pattern
    if ($(this).text() == chrome.i18n.getMessage('unblock')) {
      browser.runtime.sendMessage({
          type: blocklist.common.DELETEFROMBLOCKLIST,
          pattern: pattern
        })
        .then(blocklist.manager.handleDeleteBlocklistResponse);
      // grey out the input, disable edit button.
      patShowDiv.show();
      editBtn.hide();
      patEditTable.hide();
      patRow.addClass('deleted-pattern');
      $(this).text(chrome.i18n.getMessage('block'));
    } else {
      // Restore pattern
      $(this).text(chrome.i18n.getMessage('unblock'));
      editBtn.show();
      patRow.removeClass('deleted-pattern');
      // Add pattern back to local storage.
      var curPat = blocklist.manager.assemblePattern_(patPreSub.val(),
                                                      patPreDom.val());
      browser.runtime.sendMessage({
        type: blocklist.common.ADDTOBLOCKLIST,
        pattern: curPat
      }).then(blocklist.manager.handleAddBlocklistResponse);
    }
  });
  // Save manual edit.
  // Delete the previous pattern and add current one.
  // Press enter in the input field or click OK.
  patEditInput.keyup(function(event) {
    switch (event.keyCode) {
      case 13:
        patEditInputOK.click();
        break;
    }
  });
  patEditInputOK.click(function() {
    var prePat = blocklist.manager.
      assemblePattern_(patPreSub.val(), patPreDom.val());
    // Check current pattern first, if it is not a valid pattern,
    // return without changing the previous pattern.
    var curPat = blocklist.manager.assemblePattern_(
        patEditInput.val(), patPreDom.val());
    if (!blocklist.manager.validateHost_(curPat)) {
      blocklist.manager.showMessage(chrome.i18n.getMessage('invalidPattern'),
                                    '#FF0000');
    } else {
      browser.runtime.sendMessage({
        type: blocklist.common.DELETEFROMBLOCKLIST,
        pattern: prePat
      }).then(blocklist.manager.handleDeleteBlocklistResponse);
      blocklist.manager.showLongInfo_(patShowDiv, curPat, 60);
      browser.runtime.sendMessage({
        type: blocklist.common.ADDTOBLOCKLIST,
        pattern: curPat
      }).then(blocklist.manager.handleAddBlocklistResponse);
      patPreSub.val(patEditInput.val());
    }
    patEditTable.hide();
    patShowDiv.show();
  });

  // Resume the change
  patEditInputCancel.click(function() {
    patEditInput.val(patPreSub.val());
    patEditTable.hide();
    patShowDiv.show();
  });

  return patRow;
};

/**
 * Validates a host.
 * @param {string} host The host to be validated.
 * @return {boolean} true if the host is valid.
 * @private
 */
blocklist.manager.validateHost_ = function(host) {
  var results = blocklist.manager.VALID_HOST_REGEX.exec(host);
  if (!results || results[0] != host) {
    return false;
  }
  return true;
};

/**
 * Callback that handles the response of the local storage request.
 * @param {Array} response Response from the background page listener.
 */
blocklist.manager.handleDeleteBlocklistResponse = function(response) {
  if (response.success) {
    browser.tabs.query({active: true}).then(function(tabs) {
      for (let tab of tabs) {
        browser.tabs.sendMessage(tab.id, {type: 'refresh'});
      }
    });
  }
};

/**
 * Callback that handles the response of the local storage request.
 * @param {Array} response Response from the background page listener.
 */
blocklist.manager.handleAddBlocklistResponse = function(response) {
  if (response.success) {
     browser.tabs.query({active: true}).then(function(tabs) {
      for (let tab of tabs) {
        browser.tabs.sendMessage(tab.id, {type: 'refresh'});
      }
    });
  }
};

/**
 * Retrieves blocklists and refreshes the management page.
 * @param {number} start Offset index for the blocklist.
 * @param {number} num Amount of patterns to fetch from blocklist.
 */
blocklist.manager.refresh = function(start, num) {
  if (start < 0) start = 0;
  browser.runtime.sendMessage({
    'type': blocklist.common.GETBLOCKLIST,
    'start': start,
    'num': num
  }).then(blocklist.manager.handleRefreshResponse);
};

/**
 * Imports patterns from the import textarea.
 */
blocklist.manager.importPatterns = function() {
  var raw_patterns = $('#manager-import-area').val().split('\n');
  var patterns = blocklist.manager.sanitizePatterns_(raw_patterns);
  if (patterns.length) {
    browser.runtime.sendMessage({
      type: blocklist.common.ADDBULKTOBLOCKLIST,
      patterns: patterns
    }).then(blocklist.manager.handleImportResponse);
  } else {
    blocklist.manager.hideImportExport();
    blocklist.manager.showMessage(
        '0' + chrome.i18n.getMessage('validPatternsMessage'), '#FFAAAA');
  }
};

/**
 * Sanitizes domain/host patterns provided by users.
 * @param {Array<string>} rawPatterns Patterns to sanitize.
 * @return {Array<string>} Sanitized, validated patterns.
 * @private
 */
blocklist.manager.sanitizePatterns_ = function(rawPatterns) {
  var patterns = new Array();
  for (var i = 0; i < rawPatterns.length; ++i) {
    candidate = rawPatterns[i];
    candidate = candidate.replace(/^\s*|\s*$/g, '');  // strip whitespace
    candidate = candidate.replace(/\s.*$/, '');  // slice after whitespace
    candidate = candidate.replace(/^https?:\/\//, '');  // slice off protocol
    candidate = candidate.replace(/^www\./, '');  // slice off www.
    candidate = candidate.replace(/\/.*$/, '');  // slice off folders
    candidate = candidate.replace(/:.*$/, '');  // slice off port
    if (blocklist.manager.validateHost_(candidate)) {
      patterns.push(candidate);
    }
  }
  return patterns;
};

/**
 * Hide import/export area and show default table.
 */
blocklist.manager.hideImportExport = function() {
  $('#manager-import-export-div').hide();
  blocklist.manager.refresh(0, blocklist.manager.BL_NUM);
};

/**
 * Callback that handles the response for an import request.
 * @param {Array} response Response from the background page listener.
 */
blocklist.manager.handleImportResponse = function(response) {
  blocklist.manager.showMessage(
      response.count + chrome.i18n.getMessage('validPatternsMessage'),
      '#CCFF99');
  blocklist.manager.hideImportExport();
};

/**
 * Fades in message for user, fades out.
 * @param {string} message Message to show.
 * @param {string} colorDef Html color code for message background.
 */
blocklist.manager.showMessage = function(message, colorDef) {
  $('#manager-message').text(message);
  $('#manager-message').css({'background-color': colorDef,
                             'font-weight': 'bold',
                             'position': 'absolute',
                             'z-index': '1000',
                             'top': '35',
                             'left': '200'});
  $('#manager-message').fadeIn(2500).fadeOut(2500);
};


/**
 * Shows textarea for blocklist pattern import.
 */
blocklist.manager.showImportArea = function() {
  var importDiv = $('#manager-import-export-div');
  importDiv.css('display', 'none');
  importDiv.html('<p id="manager-import-instruction">' +
                 chrome.i18n.getMessage('importInstructions') + '</p>' +
                 '<textarea id="manager-import-area"></textarea><br />');
  importDiv.append($('<button id="import-btn"></button>'));
  importDiv.append($('<button id="import-cancel-btn"></button>'));
  $('#import-btn').text(chrome.i18n.getMessage('import'));
  $('#import-cancel-btn').text(chrome.i18n.getMessage('cancel'));
  $('#import-btn').click(blocklist.manager.importPatterns);
  $('#import-cancel-btn').click(blocklist.manager.hideImportExport);
  $('#manager-import-area').attr('rows', '10');
  $('#manager-import-area').attr('cols', '50');
  $('#manager-block-current').hide();
  $('#manager-functions').hide();
  $('#manager-pattern-list').slideUp();
  importDiv.slideDown();
};

/**
 * Shows textarea with plain text blocklist patterns for export.
 */
blocklist.manager.showExportArea = function() {
  browser.runtime
    .sendMessage({'type': blocklist.common.GETBLOCKLIST})
    .then(blocklist.manager.handleExportListRequest);
};

/**
 * Callback that handles a request to show plain text blocklist for export.
 * @param {Array} response Response from the background page listener.
 */
blocklist.manager.handleExportListRequest = function(response) {
  if (response.blocklist != undefined && response.blocklist.length > 0) {
    var blocklistPatternString = '';
    for (var i = 0; i < response.blocklist.length; ++i) {
      blocklistPatternString += response.blocklist[i] + '\n';
    }
    var exportDiv = $('#manager-import-export-div');
    exportDiv.css('display', 'none');
    exportDiv.html('<p id="manager-export-instruction">' +
                   chrome.i18n.getMessage('exportInstructions') + '</p>' +
                   '<textarea readonly="true" id="manager-export-area">' +
                   blocklistPatternString + '</textarea><br />' +
                   '<button id="export-done-btn"></button>');
    $('#export-done-btn').text(chrome.i18n.getMessage('ok'));
    $('#export-done-btn').click(blocklist.manager.hideImportExport);
    $('#manager-export-area').attr('rows', '10');
    $('#manager-export-area').attr('cols', '50');
    $('#manager-block-current').hide();
    $('#manager-functions').hide();
    $('#manager-pattern-list').slideUp();
    exportDiv.slideDown();
  } else {
    blocklist.manager.showMessage(chrome.i18n.getMessage('noPatterns'),
                                  '#FFAAAA');
    blocklist.manager.hideImportExport();
  }
};

/**
 * Callback that handles the refresh request.
 * @param {Array} response Response from the background page listener.
 */
blocklist.manager.handleRefreshResponse = function(response) {
  $('#manager-functions').fadeIn('fast');
  $('#manager-pattern-list').fadeIn('fast');
  $('#manager-title').text(chrome.i18n.getMessage('popupTitle'));

  var listDiv = $('#manager-pattern-list');
  listDiv.empty();
  // Floating direction depends on text direction.
  var importExportPosition = 'right';
  if (chrome.i18n.getMessage('textDirection') == 'rtl') {
    importExportPosition = 'left';
  }

  if (response.blocklist != undefined && response.blocklist.length > 0) {
    blocklist.manager.addBlockCurrentHostLink(response.blocklist);
    var table = $('<table class="manager-table"><col width=30%>' +
                  '<col width=80%></table>');
    var header = $('<tr><th>' + chrome.i18n.getMessage('operation') + '</th>' +
                   '<th>' + chrome.i18n.getMessage('domain') +
                   '</th></tr>').appendTo(table);
    for (var i = 0; i < response.blocklist.length; ++i) {
      var patRow =
          blocklist.manager.createBlocklistPattern(response.blocklist[i]);
      patRow.appendTo(table);
    }
    blocklist.manager.constructHintMessage(response.start, response.num,
                                           response.total);
    listDiv.append(table);
    $('#manager-import-export-links').html(
        '<a id="manager-import-link" href="#">' +
        chrome.i18n.getMessage('import') + '</a> / ' +
        '<a id="manager-export-link" href="#">' +
        chrome.i18n.getMessage('export') + '</a>');
    $('#manager-import-export-links').css({'float': importExportPosition});
    $('#manager-export-link').click(blocklist.manager.showExportArea);
    $('#manager-import-link').click(blocklist.manager.showImportArea);
  } else {
    blocklist.manager.constructHintMessage(0, 0, 0);
    $('#manager-import-export-links').html(
      '<a id="manager-import-link" href="#">' +
      chrome.i18n.getMessage('import') + '</a>');
    $('#manager-import-export-links').css({'float': importExportPosition});
    $('#manager-import-link').click(blocklist.manager.showImportArea);
  }
};

/**
 * Adds host of active tab to blocklist.
 */
blocklist.manager.hideCurrentHost = function() {
  var pattern = $('#current-host').text();
  if (blocklist.manager.validateHost_(pattern)) {
    browser.runtime
      .sendMessage({
        type: blocklist.common.ADDTOBLOCKLIST,
        pattern: pattern
      })
      .then(blocklist.manager.handleAddBlocklistResponse);
  }
  blocklist.manager.showMessage(
      '1' + chrome.i18n.getMessage('validPatternsMessage'), '#CCFF99');
  $('#manager-block-current').hide();
  blocklist.manager.refresh(0, blocklist.manager.BL_NUM);
};


/**
 * Creates a link to block host of url in currently active tab.
 * @param {Array.<string>} blockListPatterns Patterns from the blocklist.
 */
blocklist.manager.addBlockCurrentHostLink = function(blockListPatterns) {
  browser.tabs.query({active: true}).then(function(tabs) {
      for (let tab of tabs) {
        pattern = tab.url.replace(blocklist.common.HOST_REGEX, '$2');
        if (blocklist.manager.validateHost_(pattern) &&
            blockListPatterns.indexOf(pattern) == -1) {
          $('#manager-block-current').html(
              '<a href="#">' + chrome.i18n.getMessage('blockCurrent') +
              '<span id="current-host">' + pattern + '</span></a>');
          $('#manager-block-current').css({'padding-top': '1em',
                                           'padding-bottom': '1em'});
          $('#manager-block-current').click(blocklist.manager.hideCurrentHost);
        }
      }
  });
};

/**
 * Construct hint message for management page.
 * @param {number} start The start index of blocklist.
 * @param {number} num The number of list show.
 * @param {number} total The total size of blocklist.
 */
blocklist.manager.constructHintMessage = function(start, num, total) {
  $('#manager').attr('dir', chrome.i18n.getMessage('textDirection'));
  var hintDiv = $('#manager-pattern-hint');
  var instructionDiv = $('#manager-instruction');
  var preBtn = hintDiv.find('.prev-btn');
  var nextBtn = hintDiv.find('.next-btn');
  var end = start + num;
  if (end >= total) {
    end = total;
  }
  if (total == 0) {
    blocklist.manager.addBlockCurrentHostLink([]);
    instructionDiv.css({'padding-top': '1em',
                        'padding-bottom': '1em'});
    preBtn.hide();
    nextBtn.hide();
    instructionDiv.html(chrome.i18n.getMessage('nosites'));
    return;
  }
  instructionDiv.hide();
  if (start > 0) {
    preBtn.show();
    preBtn.click(function() {
      blocklist.manager.refresh(
          start - blocklist.manager.BL_NUM, blocklist.manager.BL_NUM);
    });
  } else {
    preBtn.hide();
  }
  if (end < total) {
    nextBtn.show();
    nextBtn.click(function() {
      var deleteCount = $('tr.deleted-pattern').size();
      blocklist.manager.refresh(
          start + blocklist.manager.BL_NUM - deleteCount,
          blocklist.manager.BL_NUM);
    });
  } else {
    nextBtn.hide();
  }
  var str = '';
  str += (start + 1) + ' - ' + end + ' of ' + total;
  hintDiv.find('#manager-pattern-hint-msg').text(str);
  hintDiv.attr('dir', 'ltr');  // No translation, always left-to-right.
};


document.addEventListener('DOMContentLoaded', function() {
  blocklist.manager.refresh(0, blocklist.manager.BL_NUM);
});
