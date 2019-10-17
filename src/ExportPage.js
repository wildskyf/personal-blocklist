/* eslint-env browser, webextensions */

import React from 'react'
import { useListData } from './api'
import './ExportPage.scss'

const exportInstructions = chrome.i18n.getMessage('exportInstructions')
const cancelMessage = chrome.i18n.getMessage('cancel')

const ExportPage = props => {
  const data = useListData({
    isGetAll: true
  })

  if (!data.blocklist) {
    return <></>
  }

  return (
    <div className='root'>
      <div>{exportInstructions}</div>
      <textarea readonly rows='10' cols='50' onClick={e => e.target.select()}>
        {data.blocklist.join('\n')}
      </textarea>
      <button onClick={() => props.goHome()}>{cancelMessage}</button>
    </div>
  )
}

export default ExportPage
