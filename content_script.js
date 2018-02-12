// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview Applies blocklist features to Google search result pages.
 * @author manuelh@google.com (Manuel Holtz)
 */

/**
 * Namespace for the content script functions for Google search result pages.
 * @const
 */
blocklist.serp = {
  /**
   * List of the search results tags on Google SERP.
   * @type {[string]}
   */
  SEARCH_RESULT_TAGS: ['li', 'div'],

  /**
   * Class of the search results on Google SERP.
   * @type {string}
   */
  SEARCH_RESULT_CLASS: 'g',

  /**
   * Class to add to a search result after it was processed by the extension.
   * @type {string}
   */
  PERSONAL_BLOCKLIST_CLASS: 'pb',

  /**
   * Class of blocked search results.
   * @type {string}
   */
  BLOCKED_SEARCH_RESULT_CLASS: 'blocked',

  /**
   * Class of blocked search results that were requested to be shown.
   * @type {string}
   */
  BLOCKED_VISIBLE_SEARCH_RESULT_CLASS: 'blockedVisible',

  /**
   * Class of a element that holds block/unblock links.
   * @type {string}
   */
  BLOCK_LINK_CLASS: 'fl',

  /**
   * Class of the search result bodies on Google SERP.
   * @type {string}
   */
  SEARCH_RESULT_BODY_CLASS: 's',

  /**
   * Class of the search results lower links on Google SERP.
   * @type {string}
   */
  SEARCH_RESULT_LOWER_LINKS_CLASS: 'gl',

  /**
   * Class that contains the cite tag on Google SERP.
   * @type {string}
   */
  SEARCH_RESULT_CITE_DIV_CLASS: 'f', // note: the cite tag's parent

  /**
   * Class of the short (snippet-less) search results links on Google SERP.
   * @type {string}
   */
  SEARCH_RESULT_SHORT_LINKS_CLASS: 'vshid',

  /**
   * Class of lower links span for definition-like results (e.g. query "viagra").
   * @type {string}
   */
  DEFINITION_RESULT_LOWER_LINKS_CLASS: 'a',

  /**
   * Class of book search result table cell, used to identify book search results.
   * @type {string}
   */
  BOOK_SEARCH_RESULT_CLASS: 'bkst',

  /**
   * Class of the search results block div.
   * @type {string}
   */
  SEARCH_RESULT_BLOCK_CLASS: 'ires',

  /**
   * Id of the div that displays the result removal notification.
   * @type {string}
   */
  NOTIFICATION_DIV_ID: 'blocklistNotification',

  /**
   * Class name that identifies gws-side block links.
   * @type {string}
   */
  GWS_BLOCK_LINK_CLASS: 'kob',

  /**
   * Class name that identifies showed gws-side block links.
   * @type {string}
   */
  SHOWED_GWS_BLOCK_LINK_CLASS: 'kobb',

  /**
   * The interval between attempts to apply blocklist feats to SERP, in millisecs.
   * @type {number}
   */
  REPEAT_INTERVAL_IN_MS: 500,

  // TODO(manuelh): Use CSS file for styles instead.
  /**
   * Style of the notification for removed search results.
   * @type {string}
   */
  NOTIFICATION_STYLE : 'font-style:italic,margin-top:1em,margin-bottom:1em,',

  /**
   * Style for block links. Prevents the word "Block" from appearing on a separate
   * line to the domain being blocked.
   */
  BLOCK_LINK_STYLE: 'white-space:nowrap,',

  /**
   * Type of refresh request.
   * @type {string}
   */
  REFRESH_REQUEST: 'refresh',

  /**
   * Style of blocked search results that are shown on request.
   * @type {string}
   */
  BLOCKED_VISIBLE_STYLE: 'display:block; background-color:#FFD2D2;',

  /**
   * A regular expression to deal with redirections through Google services,
   * e.g. for translated results like
   * http://translate.google.com/translate?u=http://example.com
   * @type {RegExp}
   */
  REDIRECT_REGEX: new RegExp(
      '^(https?://[a-z.]+[.]?google([.][a-z]{2,4}){1,2})?/' +
      '[a-z_-]*[?]((img)?u|.*&(img)?u)(rl)?=([^&]*[.][^&]*).*$'),

  /**
   * A regular expression to check if personalized web search is disabled in url.
   * @type {RegExp}
   */
  PWS_REGEX: new RegExp('(&|[?])pws=0'),

  /**
   * Matches the kEI javascript property defined in the header of the Google SRP.
   * @type {RegExp}
   */
  EVENT_ID_REGEX: new RegExp('kEI\\:"([^"]+)"'),

  /**
   * The blocklisted patterns. Call refreshBlocklist to populate.
   * @type {Array.<string>}
   */
  blocklist: [],

  /**
   * The event id of the search result page.
   * @type {string}
   */
  eventId: '',

  /**
   * Whether the current search result page is https page.
   * The extension will not send info back to google via gen204 request if user is
   * under https page.
   * @type {bool}
   */
  isHttps: false,

  /**
   * Whether the search result alterations (block links etc) need to be reapplied.
   * Used by blocklist.serp.modifySearchResults_ that constitutes what happens in
   * the main process loop of the extension. This variable primarily helps with
   * efficiency, because it avoids unnecessary repetitions.
   *
   * @type {bool}
   */
  needsRefresh: false
};


/**
 * Creates a DOM element containing a "block domain" or "unblock domain" link.
 * @param {function} handler The function to bind to a click.
 * @param {string} pattern The domain pattern to send to the handler on click.
 * @param {string} className Name of the message string and span class.
 * @return {Element} A div element with the block link.
 * @private
 */
blocklist.serp.createLink_ = function(handler, pattern, className) {
  var blockLink = document.createElement('a');
  blockLink.setAttribute('dir', chrome.i18n.getMessage('textDirection'));
  blockLink.className = blocklist.serp.BLOCK_LINK_CLASS;
  blockLink.setAttribute('style', blocklist.serp.BLOCK_LINK_STYLE);
  blockLink.href = 'javascript:;';  // Do nothing, no refresh.
  blockLink.addEventListener('click', function() { handler(pattern) }, false);

  // Separate spans to avoid mixing latin chars with Arabic/Hebrew.
  var prefixSpan = document.createElement('span');
  var patternSpan = document.createElement('span');
  var suffixSpan = document.createElement('span');
  prefixSpan.appendChild(document.createTextNode(chrome.i18n.getMessage(className + 'Prefix')));
  patternSpan.appendChild(document.createTextNode(pattern));
  suffixSpan.appendChild(document.createTextNode(chrome.i18n.getMessage(className + 'Suffix')));

  blockLink.appendChild(prefixSpan);
  blockLink.appendChild(patternSpan);
  blockLink.appendChild(suffixSpan);

  var blockLinkDiv = document.createElement('div');
  blockLinkDiv.className = className;
  blockLinkDiv.appendChild(blockLink);
  return blockLinkDiv;
};

/**
 * Adds a block or unblock link to a search result.
 * @param {Element} searchResult Search result list element, including children.
 * @param {Object} linkDiv Div element with the link to add.
 */
blocklist.serp.addLink = function(searchResult, linkDiv) {
  var { serp } = blocklist;
  var regularResultSpan = searchResult.querySelector(`div.${serp.SEARCH_RESULT_CITE_DIV_CLASS}`);
  var definitionResultSpan = searchResult.querySelector(`span.${serp.DEFINITION_RESULT_LOWER_LINKS_CLASS}`);
  var shortResultDiv = searchResult.querySelector(`div.${serp.SEARCH_RESULT_BODY_CLASS} span.${serp.SEARCH_RESULT_SHORT_LINKS_CLASS}`);

  if (regularResultSpan !== null) {
    regularResultSpan.parentNode.appendChild(linkDiv);
  }
  else if (definitionResultSpan !== null) {
    definitionResultSpan.parentNode.parentNode.appendChild(linkDiv);
  }
  else if (shortResultDiv !== null) {
    shortResultDiv.parentNode.parentNode.appendChild(linkDiv);
  }
};

/**
 * Adds a DOM element containing a notification for removed results.
 * @private
 */
blocklist.serp.addBlockListNotification_ = function() {
  var showBlockedLink = document.createElement('a');
  showBlockedLink.href = 'javascript:;';  // Do nothing, no refresh.
  showBlockedLink.appendChild(document.createTextNode(chrome.i18n.getMessage('showBlockedLink')));
  showBlockedLink.addEventListener('click', function() { blocklist.serp.showBlockedResults_() }, false);

  var blocklistNotification = document.createElement('div');
  blocklistNotification.id = blocklist.serp.NOTIFICATION_DIV_ID;
  blocklistNotification.setAttribute('dir', chrome.i18n.getMessage('textDirection'));
  blocklistNotification.appendChild(document.createTextNode(chrome.i18n.getMessage('blocklistNotification') + ' ('));
  blocklistNotification.appendChild(showBlockedLink);
  blocklistNotification.appendChild(document.createTextNode(').'));
  blocklistNotification.setAttribute('style', blocklist.serp.NOTIFICATION_STYLE);

  searchResultBlock = document.querySelector('div#' + blocklist.serp.SEARCH_RESULT_BLOCK_CLASS);
  searchResultBlock.parentNode.insertBefore(blocklistNotification, searchResultBlock.nextSibling);
};


/**
 * Returns a list of search result nodes that have a specified CSS class name.
 * @param {string} className Name of the CSS class.
 * @return {!NodeList} list of search result nodes.
 * @private
 */
blocklist.serp.getSearchResultNodes_ = function(className) {
  var selector = blocklist.serp.SEARCH_RESULT_TAGS.map( tagName => `${tagName}.${className}`).join(', ');
  return document.querySelectorAll(selector);
};

/**
 * Makes blocked search results visible again.
 * @private
 */
blocklist.serp.showBlockedResults_ = function() {
  var blockedResultList = blocklist.serp.getSearchResultNodes_(blocklist.serp.BLOCKED_SEARCH_RESULT_CLASS);

  blockedResultList.forEach( brl => {
    brl.setAttribute('style', blocklist.serp.BLOCKED_VISIBLE_STYLE);
    brl.classList.remove(blocklist.serp.BLOCKED_SEARCH_RESULT_CLASS);
    brl.classList.add(blocklist.serp.BLOCKED_VISIBLE_SEARCH_RESULT_CLASS);
  });

  blocklist.serp.needsRefresh = true;
};

/**
 * Adds a pattern to the blocklist.
 * @param {string} pattern The pattern to blocklist.
 * @private
 */
blocklist.serp.addBlocklistPattern_ = function(pattern) {
  browser.runtime.sendMessage({
    type: blocklist.common.ADDTOBLOCKLIST,
    pattern: pattern,
    ei: blocklist.serp.eventId,
    enc: blocklist.serp.isHttps
  }).then(blocklist.serp.handleAddToBlocklistResponse);
};

/**
 * Removes a pattern from the blocklist.
 * @param {string} pattern The pattern to remove from the blocklist.
 * @private
 */
blocklist.serp.removeBlocklistPattern_ = function(pattern) {
  browser.runtime.sendMessage({
    type: blocklist.common.DELETEFROMBLOCKLIST,
    pattern: pattern,
    ei: blocklist.serp.eventId,
    enc: blocklist.serp.isHttps
  })
  .then(blocklist.serp.handleDeleteFromBlocklistResponse);
  return true;
};

/**
 * Parses the domain out of a Google search result page.
 * @param {Object} searchResult Search result list element (including children).
 * @return {string} A domain if found; or an empty string.
 * @private
 */
blocklist.serp.parseDomainFromSearchResult_ = function(searchResult) {
  var searchResultAnchor = searchResult.querySelector('h3 > a');
  if (searchResultAnchor === null) return '';

  var url = searchResultAnchor.getAttribute('href');
  // Sometimes, the link is an intermediate step through another google service,
  // for example Google Translate. This regex parses the target url, so that we
  // don't block translate.google.com instead of the target host.
  url = url.replace(blocklist.serp.REDIRECT_REGEX, '$7');
  // Identify domain by stripping protocol and path.
  return url.replace(blocklist.common.HOST_REGEX, '$2');
};

/**
 * Determines if and in which way a result result needs to be modified.
 * @param {Element} searchResult Search result list element, including children.
 * @private
 */
blocklist.serp.alterSearchResultNode_ = function(searchResult) {
  var host = blocklist.serp.parseDomainFromSearchResult_(searchResult);
  if (!host) return;

  // Skip if there is already a gws-side block link, this is a book search
  // vertical results, or an internal url that was not resolved.
  if (searchResult.querySelector( '.' + blocklist.serp.GWS_BLOCK_LINK_CLASS) !== null ||
      searchResult.querySelector( 'td.' + blocklist.serp.BOOK_SEARCH_RESULT_CLASS) !== null ||
      host[0] == '/') {
    // Mark search result as processed.
    searchResult.classList.add(blocklist.serp.PERSONAL_BLOCKLIST_CLASS);
    return;
  }

  // Any currently appended block/unblock links need to be replaced.
  blockLink = searchResult.querySelector('div.blockLink');
  unblockLink = searchResult.querySelector('div.unblockLink');

  // Two main cases where we need to take action:
  // 1. search result should have a block link and doesn't have one already.
  // 2. search result should have an unblock link and doesn't have one already.
  if (blockLink === null && (!searchResult.classList.contains(blocklist.serp.BLOCKED_VISIBLE_SEARCH_RESULT_CLASS))) {
    var blockLinkDiv = blocklist.serp.createLink_(blocklist.serp.addBlocklistPattern_, host, 'blockLink');

    // Replace existing link, or append.
    if (unblockLink !== null) {
      unblockLink.parentNode.replaceChild(blockLinkDiv, unblockLink);
    }
    else {
      blocklist.serp.addLink(searchResult, blockLinkDiv);
    }
  }
  else if (unblockLink === null && searchResult.classList.contains(blocklist.serp.BLOCKED_VISIBLE_SEARCH_RESULT_CLASS)) {
    // Use the pattern that caused the block, which might differ from host.
    var blockPattern = blocklist.serp.findBlockPatternForHost_(host);
    if (!blockPattern) return;

    var unblockLinkDiv = blocklist.serp.createLink_(blocklist.serp.removeBlocklistPattern_, blockPattern, 'unblockLink');

    // Replace existing link, or append.
    if (blockLink !== null) {
      blockLink.parentNode.replaceChild(unblockLinkDiv, blockLink);
    }
    else {
      blocklist.serp.addLink(searchResult, unblockLinkDiv);
    }
    return true;
  }

  // Mark search result as processed.
  searchResult.classList.add(blocklist.serp.PERSONAL_BLOCKLIST_CLASS);
};

/**
 * Removes a search result from the page.
 * @param {Object} searchResult Search result list element (including children).
 */
blocklist.serp.hideSearchResult = function(searchResult) {
  searchResult.setAttribute('style', 'display:none;');
  searchResult.classList.add(blocklist.serp.BLOCKED_SEARCH_RESULT_CLASS);
};

/**
 * Return a list of subdomains. for example, a.d.c.d will return
 * c.d, d.c.d and a.b.c.d
 * @param {string} pattern The domains pattern to extract subdomains.
 * @return {Array.<string>} Suddomain list.
 * @private
 */
blocklist.serp.extractSubDomains_ = function(pattern) {
  var subdomains = [];
  var parts = pattern.split('.');
  for (var i = parts.length - 2; i >= 0; --i) {
    subdomains.push(parts.slice(i).join('.'));
  }
  return subdomains;
};

/**
 * Checks a hostname against the blocklist patterns.
 * @param {string} hostName Host of a search result link.
 * @return {string} A blocklist pattern that matched the host (or empty string).
 * @private
 */
blocklist.serp.findBlockPatternForHost_ = result_url => {
  // hide as long as result_url (partly) match one of the list blocklist.serp.blocklist

  return blocklist.serp.blocklist.some( block_pattern => result_url.includes(block_pattern) )
};

/**
 * Removes all search results that match the blocklist.
 */
blocklist.serp.hideSearchResults = function() {
  const { serp } = blocklist;
  var searchResultList = serp.getSearchResultNodes_(serp.SEARCH_RESULT_CLASS);

  searchResultList.forEach( searchResult => {
    var matchedPattern = serp.findBlockPatternForHost_(serp.parseDomainFromSearchResult_(searchResult));

    if (matchedPattern && (
        !searchResult.classList.contains(serp.BLOCKED_SEARCH_RESULT_CLASS) &&
        !searchResult.classList.contains(serp.BLOCKED_VISIBLE_SEARCH_RESULT_CLASS)
    )) {
      if (searchResult.parentNode.classList.contains(serp.SHOWED_GWS_BLOCK_LINK_CLASS)) {
        searchResult.setAttribute('style', serp.BLOCKED_VISIBLE_STYLE);
        searchResult.classList.remove(serp.BLOCKED_SEARCH_RESULT_CLASS);
        searchResult.classList.add(serp.BLOCKED_VISIBLE_SEARCH_RESULT_CLASS);
      }
      else {
        serp.hideSearchResult(searchResult);
      }
    }

    if (!matchedPattern) {
      if (
        searchResult.classList.contains(serp.BLOCKED_SEARCH_RESULT_CLASS) ||
        searchResult.classList.contains(serp.BLOCKED_VISIBLE_SEARCH_RESULT_CLASS)
      ) {
        searchResult.classList.remove(serp.BLOCKED_VISIBLE_SEARCH_RESULT_CLASS);
        searchResult.classList.remove(serp.BLOCKED_SEARCH_RESULT_CLASS);
        searchResult.setAttribute('style', 'background-color:inherit;');
      }
    }
  })
};

/**
 * Iterates through search results, adding links and applying blocklist filter.
 * @private
 */
blocklist.serp.modifySearchResults_ = function() {
  var { serp } = blocklist;

  // Skip if personalized web search was explicitly disabled (&pws=0).
  if (serp.IsPwsDisabled_()) return;

  // Apply blocklist filter.
  if (serp.blocklist.length > 0 || serp.needsRefresh) {
    serp.hideSearchResults();
  }
  var searchResultList = serp.getSearchResultNodes_(serp.SEARCH_RESULT_CLASS);
  var processedSearchResultList = serp.getSearchResultNodes_(serp.PERSONAL_BLOCKLIST_CLASS);

  // Add blocklist links to search results until all have been processed.
  if (serp.needsRefresh || processedSearchResultList.length < searchResultList.length) {

    searchResultList.forEach( srl => serp.alterSearchResultNode_(srl) );

    // Add/hide/show notification for removed results.
    var notificationDiv = document.querySelector(`div#${serp.NOTIFICATION_DIV_ID}`);
    var blockedResults = serp.getSearchResultNodes_(serp.BLOCKED_SEARCH_RESULT_CLASS);

    if (blockedResults.length > 0) {
      if (!notificationDiv) {
        serp.addBlockListNotification_();
      }
      else {
        notificationDiv.setAttribute('style', serp.NOTIFICATION_STYLE);
      }
    }
    else if (notificationDiv != null) {
      notificationDiv.setAttribute('style', 'display:none;');
    }

    serp.needsRefresh = false;
  }
};

/**
 * Starts an infinite loop that applies the blocklist features to the page.
 * @private
 */
blocklist.serp.applyBlocklistFeatures_ = function() {
  window.setInterval(function() {
    blocklist.serp.modifySearchResults_();
  }, blocklist.serp.REPEAT_INTERVAL_IN_MS);
};

/**
 * Callback that handles the response of the local storage request.
 * @param {Array} response Response from the background page listener.
 */
blocklist.serp.handleAddToBlocklistResponse = function(response) {
  if (response.success) {
    blocklist.serp.refreshBlocklist();
    blocklist.serp.needsRefresh = true;
  }
};

/**
 * Callback that handles the response of the local storage request.
 * @param {Array} response Response from the background page listener.
 */
blocklist.serp.handleDeleteFromBlocklistResponse = function(response) {
  if (response.success) {
    // Reset blocked results and refresh.
    var searchResultList = blocklist.serp.getSearchResultNodes_(blocklist.serp.SEARCH_RESULT_CLASS);

    searchResultList.forEach( srl => {
      var pattern = blocklist.serp.parseDomainFromSearchResult_(srl);
      var subdomains = blocklist.serp.extractSubDomains_(pattern);
      if (srl.classList.contains(blocklist.serp.BLOCKED_VISIBLE_SEARCH_RESULT_CLASS) && subdomains.indexOf(response.pattern) != -1) {
        srl.classList.remove(blocklist.serp.BLOCKED_VISIBLE_SEARCH_RESULT_CLASS)
        srl.classList.remove(blocklist.serp.BLOCKED_SEARCH_RESULT_CLASS);
        // Clear the search result's background.
        srl.setAttribute('style', 'background-color:inherit;');
      }
    });
    blocklist.serp.refreshBlocklist();
    blocklist.serp.needsRefresh = true;
  }
};

/**
 * Callback that handles the response of the local storage request.
 * @param {Array} response Response from the background page listener.
 */
blocklist.serp.handleGetBlocklistResponse = function(response) {
  if (response && response.blocklist != undefined) {
    blocklist.serp.blocklist = response.blocklist;
  }
};

/**
 * Retrieves blocklisted domains from localstorage.
 */
blocklist.serp.refreshBlocklist = function() {
  browser.runtime.sendMessage({
    type: blocklist.common.GETBLOCKLIST
  })
  .then(blocklist.serp.handleGetBlocklistResponse);
};

/**
 * Get if the current page is using https protocol.
 * @private
 */
blocklist.serp.getIsHttpsPage_ = function() {
  blocklist.serp.isHttps = (document.URL.indexOf('https://') == 0);
};

/**
 * Check if personalized web search is disabled (pws parameter is 0).
 * @return {boolean} True if url indicates personalized web search was disabled.
 * @private
 */
blocklist.serp.IsPwsDisabled_ = function() {
  return document.URL.match(blocklist.serp.PWS_REGEX) !== null;
};

/**
 * Get event id of this search result page.
 * @private
 */
blocklist.serp.getEventId_ = function() {
  blocklist.serp.eventId = 'null';
  try {
    var head = document.getElementsByTagName('head')[0];
    var scripts = head.getElementsByTagName('script');

    scripts.forEach( script => {
      var match = script.text.match(blocklist.serp.EVENT_ID_REGEX);
      if (match) {
        blocklist.serp.eventId = match[1];
      }
    });
  } catch (e) {
  }
};

/**
 * Exposes a listener, so that it can accept refresh request from manager.
 */
blocklist.serp.startBackgroundListeners = function() {
  browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type == blocklist.serp.REFRESH_REQUEST) {
      blocklist.serp.refreshBlocklist();
      blocklist.serp.needsRefresh = true;
    }
  });
};

blocklist.serp.getIsHttpsPage_();
blocklist.serp.getEventId_();
blocklist.serp.refreshBlocklist();
blocklist.serp.applyBlocklistFeatures_();
blocklist.serp.startBackgroundListeners();

