/* eslint-env browser, webextensions */

import React, { useState } from 'react'
import ReactPaginate from 'react-paginate'
import { useListData, editPattern, deletePattern } from './api'
import './AllPatterns.scss'

const AllPatterns = () => {
  const [isEditing, setIsEditing] = useState(-1)
  const [currentPage, setCurrentPage] = useState(0)
  const data = useListData(currentPage)
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

  return (
    <>
      <div className='table'>
        <div className='thead'>
          <div className='tr'>
            <div className='th'>操作</div>
            <div className='th url'>
              <div>網站</div>
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
                    <div onClick={() => allowPattern(pattern)}>允許</div>
                    {
                      isPatternEditing ? (
                        <div onClick={() => saveEditedPattern(pattern)}>儲存</div>
                      ) : (
                        <div onClick={() => setIsEditing(index)}>編輯</div>
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
      </div>
    </>
  )
}

export default AllPatterns
