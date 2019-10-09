window.addEventListener('load', () => {
  var $block_shortcut = document.querySelector('#block-shortcut')

  $block_shortcut.addEventListener('change', evt => {
    var value = evt.target.checked

    browser.storage.sync.set({
      hide_shortcut_in_search_result: value
    })
  })

  const HIDESHORTCUT = 'hide_shortcut_in_search_result'

  browser.storage.sync.get(HIDESHORTCUT).then(item => {
    $block_shortcut.checked = item[HIDESHORTCUT]
  })
})
