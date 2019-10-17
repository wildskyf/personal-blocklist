/* eslint-env webextensions */
/* global blocklist */

import { useState, useEffect } from 'react'

const perPageCount = 20

export const useListData = currentPage => {
  const [data, setData] = useState({})

  useEffect(() => {
    browser.runtime.sendMessage({
      type: blocklist.common.GETBLOCKLIST,
      start: currentPage * perPageCount,
      num: perPageCount
    }).then(data => {
      setData(data)
    })
  }, [currentPage])

  return data
}

export const addPattern = pattern => browser.runtime.sendMessage({
  type: blocklist.common.ADDTOBLOCKLIST,
  pattern: pattern
})

export const batchAddPattern = patterns => browser.runtime.sendMessage({
  type: blocklist.common.ADDBULKTOBLOCKLIST,
  patterns: patterns
})

export const deletePattern = pattern => browser.runtime.sendMessage({
  type: blocklist.common.DELETEFROMBLOCKLIST,
  pattern: pattern
})

export const editPattern = async (oldPattern, newPattern) => {
  await deletePattern(oldPattern)
  return addPattern(newPattern)
}
