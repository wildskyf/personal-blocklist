/* eslint-env webextensions */
/* global blocklist */

import { useState, useEffect } from 'react'

export const useListData = () => {
  const [data, setData] = useState({})

  useEffect(() => {
    browser.runtime.sendMessage({
      type: blocklist.common.GETBLOCKLIST,
      start: 0,
      num: 20
    }).then(data => {
      setData(data)
    })
  }, [browser])

  return data
}

export const addPattern = pattern => browser.runtime.sendMessage({
  type: blocklist.common.ADDTOBLOCKLIST,
  pattern: pattern
})

export const deletePattern = pattern => browser.runtime.sendMessage({
  type: blocklist.common.DELETEFROMBLOCKLIST,
  pattern: pattern
})

export const editPattern = async (oldPattern, newPattern) => {
  await deletePattern(oldPattern)
  return addPattern(newPattern)
}
