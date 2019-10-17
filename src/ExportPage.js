/* eslint-env browser, webextensions */

import React from 'react'
import { useListData } from './api'
import './ExportPage.scss'

const ExportPage = props => {
  const data = useListData()

  if (!data.blocklist) {
    return <></>
  }

  return (
    <div className='root'>
      <div>複製列表到剪貼簿</div>
      <textarea readonly rows='10' cols='50' onClick={e => e.target.select()}>
        {data.blocklist.join('\n')}
      </textarea>
      <button onClick={() => props.goHome()}>返回</button>
    </div>
  )
}

export default ExportPage
