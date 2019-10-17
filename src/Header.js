/* eslint-env webextensions */
import React from 'react'
import './Header.scss'

const popUpTitle = chrome.i18n.getMessage('popupTitle')

const pages = [
  {
    id: 'all-patterns',
    text: popUpTitle
  },
  {
    id: 'import',
    text: '匯入'
  },
  {
    id: 'export',
    text: '匯出'
  }
]

const Header = ({ currentPage, setCurrentPage }) => {
  return (
    <ul>
      {
        pages.map(({ id, text }) => (
          <li
            key={id}
            className={currentPage === id ? 'active' : ''}
            onClick={() => setCurrentPage(id)}
          >
            {text}
          </li>
        ))
      }
    </ul>
  )
}

export default Header
