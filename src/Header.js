/* eslint-env webextensions */
import React from 'react'
import './Header.scss'

const pages = [
  {
    id: 'all-patterns',
    text: chrome.i18n.getMessage('popupTitle')
  },
  {
    id: 'import',
    text: chrome.i18n.getMessage('import')
  },
  {
    id: 'export',
    text: chrome.i18n.getMessage('export')
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
