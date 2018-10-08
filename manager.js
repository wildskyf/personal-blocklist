// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Google search result page pattern blocking management
 * functionalities.
 * @origin_author zhonglei@google.com (Ray Zhong)
 * @author wildsky@moztw.org (Geng-Zhi Fann)
 */

/**
 * Namespace for the blocklist management.
 * @const
 */
blocklist.manager = {};

var { manager } = blocklist;

/**
 * Number of blocklist item fetched each time.
 * @type {Num}
 */
manager.BL_NUM = 20;

/**
 * Whether current page is popup window or page
 * @type {bool}
 */
manager.isPopupWindow = !(location.href && location.href.includes('isPage'));

/**
 * Trim text which is too long to fit in the element. Use title to show complete
 * text.
 * @param {Object} element The element where the text shows.
 * @param {string} text The text to show.
 * @param {Num} length The length limitation for the text.
 * @private
 */
manager.showLongInfo_ = (element, text, length) => {
  if (!text || !element) return;

  if (text.length > length) {
    var subText = text.substring(0, length) + '...';
    element.text(subText);
    element.attr('title', text);
  }
  else {
    element.text(text);
  }
};

/**
 * Create an editable blocklist url pattern.
 * @param {string} pattern The url pattern to blocklist.
 * @return {Element} A tr element with the pattern and operation.
 */
manager.createBlocklistPattern = pattern => {

  // Constructs layout.
  var $row = $(`
  <tr>
    <td class="oper" style="text-align:center">
      <a href="javascript:void(0);" class="manager-btn delete-btn">
        ${chrome.i18n.getMessage('unblock')}
      </a>
      <a href="javascript:void(0);" class="manager-btn edit-btn">
        ${chrome.i18n.getMessage('edit')}
      </a>
    </td>

    <td class="pat">
      <div class="patShow">
        <input type="hidden" />
      </div>

      <table class="patEdit">
        <col width=75%><col width=25%>
        <tr class="patEditRow">
          <td class="patEditTd">
            <input class="pat-edit-input-text" type="text" value="${pattern}" style="max-width:80%;" />
          </td>
          <td class="patBtnTd">
            <button class="manager-btn ok-btn">
              ${chrome.i18n.getMessage('ok')}
            </button>
            <button class="manager-btn cancel-btn">
              ${chrome.i18n.getMessage('cancel')}
            </button>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  `);

  var $deleteBtn = $row.find('a.delete-btn');
  var $editBtn = $row.find('a.edit-btn');

  var $patternShow = $row.find('div.patShow');
  var $patPreDom = $row.find('div.patShow input'); // the pattern before editing

  var $patEditTable = $row.find('table.patEdit').hide();

  // Initialize values.
  manager.showLongInfo_($patternShow, pattern, 60);

  var $patEditInput = $row.find('.pat-edit-input-text');
  var $patEditInputOK = $row.find('button.ok-btn');
  var $patEditInputCancel = $row.find('button.cancel-btn');

  $editBtn.click( () => {
    $patternShow.hide();
    $patEditTable.show();
    $patEditInput.select();
  });

  $deleteBtn.click(function() {
    var deleting = $(this).text().trim() == chrome.i18n.getMessage('unblock').trim();

    if (deleting) {
      browser.runtime.sendMessage({
        type: blocklist.common.DELETEFROMBLOCKLIST,
        pattern: pattern
      })
      .then(manager.sendRefresh);
      // grey out the input, disable edit button.

      $patternShow.show();
      $editBtn.hide();
      $patEditTable.hide();
      $row.addClass('deleted-pattern');
      $(this).text(chrome.i18n.getMessage('block'));
    }
    else {
      browser.runtime.sendMessage({
        type: blocklist.common.ADDTOBLOCKLIST,
        pattern: pattern
      }).then(manager.sendRefresh);

      $editBtn.show();
      $row.removeClass('deleted-pattern');
      $(this).text(chrome.i18n.getMessage('unblock'));
    }
  });

  $patEditInput.keyup( event => event.keyCode == 13 && $patEditInputOK.click());
  $patEditInputOK.click( async () => {
    var old_pattern = pattern,
        new_pattern = $patEditInput.val();

    await browser.runtime.sendMessage({
      type: blocklist.common.DELETEFROMBLOCKLIST,
      pattern: old_pattern
    }).then(manager.sendRefresh);

    manager.showLongInfo_($patternShow, new_pattern, 60);

    await browser.runtime.sendMessage({
      type: blocklist.common.ADDTOBLOCKLIST,
      pattern: new_pattern
    }).then(manager.sendRefresh);

    pattern = new_pattern
    $patPreDom.val(pattern);
    $patEditTable.hide();
    $patternShow.show();
  });

  $patEditInputCancel.click( () => {
    pattern = $patPreDom.val();
    $patEditInput.val(pattern);
    $patEditTable.hide();
    $patternShow.show();
  });

  return $row;
};

/**
 * Callback that handles the response of the local storage request.
 * @param {Array} response Response from the background page listener.
 */
manager.sendRefresh = res => {
  if (!res.success) return;

  browser.tabs.query({active: true}).then( tabs => {
    for (let tab of tabs) {
      browser.tabs.sendMessage(tab.id, {type: 'refresh'});
    }
  });
};

/**
 * Callback that handles the response of the local storage request.
 * @param {Array} response Response from the background page listener.
 */
manager.sendRefresh = res => {
  if (!res.success) return;

  browser.tabs.query({active: true}).then( tabs => {
    for (let tab of tabs) {
      browser.tabs.sendMessage(tab.id, {type: 'refresh'});
    }
  });

};

/**
 * Retrieves blocklists and refreshes the management page.
 * @param {number} start Offset index for the blocklist.
 * @param {number} num Amount of patterns to fetch from blocklist.
 */
manager.refresh = (start, num) => {
  if (start < 0) start = 0;

  if (manager.isPopupWindow) {
    browser.runtime.sendMessage({
      'type': blocklist.common.GETBLOCKLIST,
      'start': start,
      'num': num
    }).then(manager.handleRefreshResponse);
  }
  else {
    browser.runtime.sendMessage({
      'type': blocklist.common.GETBLOCKLIST,
      'start': start,
      'num': -1
    }).then(manager.handleRefreshResponse);
  }

};

/**
 * Imports patterns from the import textarea.
 */
manager.importPatterns = () => {
  var patterns = $('#manager-import-area').val().split('\n');
  if (patterns.length) {
    browser.runtime.sendMessage({
      type: blocklist.common.ADDBULKTOBLOCKLIST,
      patterns: patterns
    }).then(manager.handleImportResponse);
  }
  else {
    manager.hideImportExport();
    manager.showMessage('0' + chrome.i18n.getMessage('validPatternsMessage'), '#FFAAAA');
  }
};

/**
 * Hide import/export area and show default table.
 */
manager.hideImportExport = () => {
  $('#manager-import-export-div').hide();
  manager.refresh(0, manager.BL_NUM);
};

/**
 * Callback that handles the response for an import request.
 * @param {Array} response Response from the background page listener.
 */
manager.handleImportResponse = response => {
  manager.showMessage(response.count + chrome.i18n.getMessage('validPatternsMessage'), '#CCFF99');
  manager.hideImportExport();
};

/**
 * Fades in message for user, fades out.
 * @param {string} message Message to show.
 * @param {string} colorDef Html color code for message background.
 */
manager.showMessage = (message, colorDef) => {
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
manager.showImportArea = () => {
  var importDiv = $('#manager-import-export-div');
  importDiv.css('display', 'none');
  importDiv.html('<p id="manager-import-instruction">' +
                 chrome.i18n.getMessage('importInstructions') + '</p>' +
                 '<textarea id="manager-import-area"></textarea><br />');
  importDiv.append($('<button id="import-btn"></button>'));
  importDiv.append($('<button id="import-cancel-btn"></button>'));
  $('#import-btn').text(chrome.i18n.getMessage('import'));
  $('#import-cancel-btn').text(chrome.i18n.getMessage('cancel'));
  $('#import-btn').click(manager.importPatterns);
  $('#import-cancel-btn').click(manager.hideImportExport);
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
manager.showExportArea = () => {
  browser.runtime.sendMessage({
    'type': blocklist.common.GETBLOCKLIST
  }).then(manager.handleExportListRequest);
};

/**
 * Callback that handles a request to show plain text blocklist for export.
 * @param {Array} response Response from the background page listener.
 */
manager.handleExportListRequest = response => {

  if ( !(response.blocklist && response.blocklist.length)) {
    manager.showMessage(chrome.i18n.getMessage('noPatterns'), '#FFAAAA');
    manager.hideImportExport();
    return;
  }

  var blocklistPatternString = response.blocklist.reduce( (sum, current) => sum + current + '\n', '')

  var exportDiv = $('#manager-import-export-div')
    .css('display', 'none')
    .html(`
      <p id="manager-export-instruction">${chrome.i18n.getMessage('exportInstructions')}</p>
       <textarea readonly="true" id="manager-export-area">${blocklistPatternString}</textarea>
       <br />
       <button id="export-done-btn"></button>
    `);
  $('#export-done-btn').text(chrome.i18n.getMessage('ok'));
  $('#export-done-btn').click(manager.hideImportExport);
  $('#manager-export-area').attr('rows', '10');
  $('#manager-export-area').attr('cols', '50');
  $('#manager-block-current').hide();
  $('#manager-functions').hide();
  $('#manager-pattern-list').slideUp();
  exportDiv.slideDown();
};

manager.displayFullListLink = () => {
  var $link = $('#manager-full-list');

  if (!manager.isPopupWindow) {
    $link.remove();
    return;
  }

  $link.html(`<a href="#">${chrome.i18n.getMessage('popupFullList')}</a>`);
  $link.css({'padding-top': '1em', 'padding-bottom': '1em'});
  $link.on('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("/manager.html?isPage=1") });
    window.close();
  });
};

/**
 * Callback that handles the refresh request.
 * @param {Array} response Response from the background page listener.
 */
manager.handleRefreshResponse = response => {
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

    if (manager.isPopupWindow) manager.addBlockCurrentHostLink(response.blocklist);

    var table = $('<table class="manager-table"><col width=30%><col width=80%></table>');
    var header = $('<tr><th>' + chrome.i18n.getMessage('operation') + '</th>' +
                   '<th>' + chrome.i18n.getMessage('domain') + '</th></tr>').appendTo(table);

    for (var i = 0; i < response.blocklist.length; ++i) {
      var patRow = manager.createBlocklistPattern(response.blocklist[i]);
      patRow.appendTo(table);
    }

    manager.constructHintMessage(response.start, response.num, response.total);
    listDiv.append(table);
    $('#manager-import-export-links').html(
        '<a id="manager-import-link" href="#">' +
        chrome.i18n.getMessage('import') + '</a> / ' +
        '<a id="manager-export-link" href="#">' +
        chrome.i18n.getMessage('export') + '</a>');
    $('#manager-import-export-links').css({'float': importExportPosition});
    $('#manager-export-link').click(manager.showExportArea);
    $('#manager-import-link').click(manager.showImportArea);
  }
  else {
    manager.constructHintMessage(0, 0, 0);
    $('#manager-import-export-links').html(
      '<a id="manager-import-link" href="#">' +
      chrome.i18n.getMessage('import') + '</a>');
    $('#manager-import-export-links').css({'float': importExportPosition});
    $('#manager-import-link').click(manager.showImportArea);
  }

  manager.displayFullListLink();
};

/**
 * Adds host of active tab to blocklist.
 */
manager.hideCurrentHost = () => {
  var pattern = $('#current-host').text();

  browser.runtime.sendMessage({
    type: blocklist.common.ADDTOBLOCKLIST,
    pattern: pattern
  }).then(manager.sendRefresh);

  manager.showMessage('1' + chrome.i18n.getMessage('validPatternsMessage'), '#CCFF99');
  $('#manager-block-current').hide();
  manager.refresh(0, manager.BL_NUM);
};


/**
 * Creates a link to block host of url in currently active tab.
 * @param {Array.<string>} blockListPatterns Patterns from the blocklist.
 */
manager.addBlockCurrentHostLink = blockListPatterns => {
  browser.tabs.query({active: true}).then( tabs => {
      for (let tab of tabs) {
        var pattern = tab.url.replace(blocklist.common.HOST_REGEX, '$2');
        if (!blockListPatterns.includes(pattern)) {
          $('#manager-block-current').html(`<a href="#">${chrome.i18n.getMessage('blockCurrent')}<span id="current-host">${pattern}</span></a>`);
          $('#manager-block-current').css({'padding-top': '1em', 'padding-bottom': '1em'});
          $('#manager-block-current').click(manager.hideCurrentHost);
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
manager.constructHintMessage = (start, num, total) => {
  $('#manager').attr('dir', chrome.i18n.getMessage('textDirection'));
  var hintDiv = $('#manager-pattern-hint');
  var instructionDiv = $('#manager-instruction');
  var preBtn = hintDiv.find('.prev-btn');
  var nextBtn = hintDiv.find('.next-btn');
  var end = start + num;
  var hintStr = '';

  if (end >= total) {
    end = total;
  }
  if (total == 0) {
    if (manager.isPopupWindow) manager.addBlockCurrentHostLink([]);
    instructionDiv.css({ 'padding-top': '1em', 'padding-bottom': '1em' });
    preBtn.hide();
    nextBtn.hide();
    instructionDiv.html(chrome.i18n.getMessage('nosites'));
    return;
  }
  instructionDiv.hide();

  if (manager.isPopupWindow) {
    if (start > 0) {
      preBtn.show();
      preBtn.click( () => {
        manager.refresh(start - manager.BL_NUM, manager.BL_NUM);
      });
    }
    else {
      preBtn.hide();
    }

    if (end < total) {
      nextBtn.show();
      nextBtn.click( () => {
        var deleteCount = $('tr.deleted-pattern').length;
        manager.refresh(start + manager.BL_NUM - deleteCount, manager.BL_NUM);
      });
    }
    else {
      nextBtn.hide();
    }

    hintStr += (start + 1) + ' - ' + end + ' of ' + total;
    hintDiv.find('#manager-pattern-hint-msg').text(hintStr);
    hintDiv.attr('dir', 'ltr');  // No translation, always left-to-right.
  }
  else {
    // show all result

    preBtn.hide();
    nextBtn.hide();

    hintStr += 'All of ' + total;
    hintDiv.find('#manager-pattern-hint-msg').text(hintStr);
    hintDiv.attr('dir', 'ltr');  // No translation, always left-to-right.
  }
};

document.addEventListener('DOMContentLoaded', () => {
  manager.refresh(0, manager.BL_NUM);
});

