/* eslint-env webextensions */
/* global blocklist */
import React, { useState, useEffect } from 'react'
import './Main.scss'

const Main = () => {
  const [data, setData] = useState({})

  useEffect(() => {
    browser.runtime.sendMessage({
      type: blocklist.common.GETBLOCKLIST,
      start: 0,
      num: 20
    }).then(data => {
      setData(data)
    })
  }, [])

  if (!data.blocklist) {
    return <></>
  }

  return (
    <>
      <table>
        <tr>
          <th>操作</th>
          <th className='url'>網站</th>
        </tr>
        {
          data.blocklist.map(url => {
            return (
              <tr>
                <td>
                  <div>允許</div>
                  <div>編輯</div>
                </td>
                <td className='url'>{url}</td>
              </tr>
            )
          })
        }
      </table>
    </>
  )
}

export default Main
