/* eslint-env browser, webextensions */

import React from 'react'
import './ImportPage.scss'
import { batchAddPattern } from './api'

const ImportPage = props => {
  const textareaRef = React.createRef()

  const importPatterns = async () => {
    const patterns = textareaRef.current.value.split('\n')

    if (patterns.length === 0) return false

    await batchAddPattern(patterns)
    props.goHome()
    // TODO: show Success Message
  }

  return (
    <div className='root'>
      <div>請輸入要封鎖的網站列表（一行一個）</div>
      <textarea rows='10' cols='50' ref={textareaRef} />

      <button onClick={importPatterns}>匯入</button>
      <button>取消</button>
    </div>
  )
}

export default ImportPage
