/* eslint-env browser, webextensions */

import React, { useState } from 'react'
import { useListData, editPattern, deletePattern } from './api'
import './Main.scss'

const Main = () => {
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
      <table>
        <tr>
          <th>操作</th>
          <th className='url'>
            <div>網站</div>
          </th>
        </tr>
        {
          data.blocklist.map((pattern, index) => {
            const isPatternEditing = isEditing === index

            return (
              <tr key={`tr-${index}`}>
                <td className='actions'>
                  <div onClick={() => allowPattern(pattern)}>允許</div>
                  {
                    isPatternEditing ? (
                      <div onClick={() => saveEditedPattern(pattern)}>儲存</div>
                    ) : (
                      <div onClick={() => setIsEditing(index)}>編輯</div>
                    )
                  }
                </td>
                <td className='url'>
                  {
                    isPatternEditing ? (
                      <input
                        type='text'
                        defaultValue={pattern}
                        ref={inputRef}
                      />
                    ) : <div>{pattern}</div>
                  }
                </td>
              </tr>
            )
          })
        }
      </table>
    </>
  )
}

export default Main
