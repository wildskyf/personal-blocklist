import React, { useState } from 'react'
import Header from './Header'
import AllPatterns from './AllPatterns'
import ImportPage from './ImportPage'
import ExportPage from './ExportPage'
import './App.css'

function App () {
  const [currentPage, setCurrentPage] = useState('all-patterns')
  const goHome = () => setCurrentPage('all-patterns')

  return (
    <div className='App'>
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      {
        (() => {
          switch (currentPage) {
            case 'all-patterns': {
              return <AllPatterns />
            }
            case 'import': {
              return <ImportPage goHome={goHome} />
            }
            case 'export': {
              return <ExportPage goHome={goHome} />
            }
          }
          return <></>
        })()
      }
    </div>
  )
}

export default App
