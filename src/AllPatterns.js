/* eslint-env browser, webextensions */

import React, { useState } from 'react'
import { useListData, editPattern, deletePattern } from './api'
import './AllPatterns.scss'

const AllPatterns = () => {
  const data = useListData()
  const [isEditing, setIsEditing] = useState(-1)
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
        <div className='tfoot' />
      </div>
    </>
  )
}

export default AllPatterns
