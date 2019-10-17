/* eslint-env browser, webextensions */

import React from 'react'
import './ImportPage.scss'
import { batchAddPattern } from './api'

const importInstructions = chrome.i18n.getMessage('importInstructions')
const importMessage = chrome.i18n.getMessage('import')
const cancelMessage = chrome.i18n.getMessage('cancel')

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
      <div>{importInstructions}</div>
      <textarea rows='10' cols='50' ref={textareaRef} />

      <button onClick={importPatterns}>{importMessage}</button>
      <button>{cancelMessage}</button>
    </div>
  )
}

export default ImportPage
