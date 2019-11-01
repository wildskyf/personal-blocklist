/* eslint-env webextensions */
/* global blocklist */

import { useState, useEffect } from 'react'

const perPageCount = 20

export const useCurrnetDomain = () => {
  const [currentDomain, setCurrentDomain] = useState('')

  useEffect(() => {
    (async () => {
      const tabs = await browser.tabs.query({ active: true })
      const pattern = tabs.map(tab =>
        tab.url.replace(blocklist.common.HOST_REGEX, '$2')
      )[0]
      setCurrentDomain(pattern)
    })()
  })

  return currentDomain
}

export const useListData = ({ currentPage, isGetAll, search }) => {
  const [data, setData] = useState({})

  useEffect(() => {
    const requestData = isGetAll ? {} : {
      start: currentPage * perPageCount,
      num: perPageCount,
      search
    }

    browser.runtime.sendMessage({
      type: blocklist.common.GETBLOCKLIST,
      ...requestData
    }).then(data => {
      setData(data)
    })
  }, [currentPage, isGetAll, search])

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

export const useIsPatternBlock = (pattern) => {
  const listData = useListData({ currentPage: 0, isGetAll: true })
  return listData && listData.blocklist && listData.blocklist.includes(pattern)
}
