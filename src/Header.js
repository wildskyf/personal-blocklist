/* eslint-env webextensions */
import React from 'react'
import './Header.scss'

const popUpTitle = chrome.i18n.getMessage('popupTitle')

const Header = () => {
  return (
    <div className="header">{popUpTitle}</div>
  )
}

export default Header
