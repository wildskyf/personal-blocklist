/* eslint-env browser, webextensions */

import React, { useState } from 'react'
import ReactPaginate from 'react-paginate'
import { useListData, addPattern, editPattern, deletePattern, useCurrnetDomain, useIsPatternBlock } from './api'
import './AllPatterns.scss'

const operationMessage = chrome.i18n.getMessage('operation')
const domainMessage = chrome.i18n.getMessage('domain')
const unblockMessage = chrome.i18n.getMessage('unblock')
const okMessage = chrome.i18n.getMessage('ok')
const editMessage = chrome.i18n.getMessage('edit')
const nositesMessage = chrome.i18n.getMessage('nosites')
const blockCurrentMessage = chrome.i18n.getMessage('blockCurrent')

const Toolbar = ({ setFilterString }) => {
  const currentDomain = useCurrnetDomain()
  const isCurrentBlocked = useIsPatternBlock(currentDomain)

  const blockCurrentDomain = async () => {
    await addPattern(currentDomain)
    window.location.reload()
  }

  const unblockCurrentDomain = async () => {
    const res = await deletePattern(currentDomain)
    if (res.success) {
      window.location.reload()
    }
  }

  if (!currentDomain) {
    return <></>
  }

  return (
    <div className='toolbar'>
      {
        isCurrentBlocked ? (
          <div className='block-button' onClick={unblockCurrentDomain}>
            {unblockMessage}: {currentDomain}
          </div>
        ) : (
          <div className='block-button' onClick={blockCurrentDomain}>
            {blockCurrentMessage} {currentDomain}
          </div>
        )
      }
      {
        setFilterString ? (
          <div className='search-bar'>
            <input
              type='search'
              placeholder='type to search...'
              onChange={e => setFilterString(e.target.value)}
            />
          </div>
        ) : null
      }
    </div>
  )
}

const AllPatterns = () => {
  const [isEditing, setIsEditing] = useState(-1)
  const [currentPage, setCurrentPage] = useState(0)
  const [filterString, setFilterString] = useState('')
  const data = useListData({ currentPage, search: filterString })
  const inputRef = React.createRef()

  const allowPattern = async pattern => {
    const res = await deletePattern(pattern)

    if (res.success) {
      window.location.reload()
    }
  }

  const saveEditedPattern = async oldPattern => {
    if (!inputRef.current.value || oldPattern === inputRef.current.value) {
      return setIsEditing(-1)
    }

    await editPattern(oldPattern, inputRef.current.value)
    setIsEditing(-1)
    window.location.reload()
  }

  if (!data.blocklist) {
    return <></>
  }

  if (data.blocklist.length === 0) {
    return (
      <>
        <Toolbar />
        <p className='no-site-message' dangerouslySetInnerHTML={{ __html: nositesMessage }} />
      </>
    )
  }

  return (
    <>
      <Toolbar setFilterString={setFilterString} />
      <div className='table'>
        <div className='thead'>
          <div className='tr'>
            <div className='th'>{operationMessage}</div>
            <div className='th url'>
              <div>{domainMessage}</div>
            </div>
          </div>
        </div>
        <div className='tbody'>
          {
            data.blocklist.map((pattern, index) => {
              const isPatternEditing = isEditing === index

              return (
                <div className='tr' key={`tr-${index}`}>
                  <div className='td actions'>
                    <div onClick={() => allowPattern(pattern)}>{unblockMessage}</div>
                    {
                      isPatternEditing ? (
                        <div onClick={() => saveEditedPattern(pattern)}>{okMessage}</div>
                      ) : (
                        <div onClick={() => setIsEditing(index)}>{editMessage}</div>
                      )
                    }
                  </div>
                  <div className='td url'>
                    {
                      isPatternEditing ? (
                        <input
                          type='text'
                          defaultValue={pattern}
                          ref={inputRef}
                        />
                      ) : <div>{pattern}</div>
                    }
                  </div>
                </div>
              )
            })
          }
        </div>
        {
          (data.total <= data.num) ? null : (
            <ReactPaginate
              previousLabel='<'
              nextLabel='>'
              breakLabel='...'
              pageCount={Math.floor(data.total / data.num)}
              marginPagesDisplayed={2}
              pageRangeDisplayed={5}
              onPageChange={({ selected }) => setCurrentPage(selected)}
              containerClassName='tfoot pagination'
              subContainerClassName='pages pagination'
              activeClassName='active'
            />
          )
        }
      </div>
    </>
  )
}

export default AllPatterns
