import React from 'react'


export default function ReleaseNotes() {

  return (

    <div style={{textAlign: 'left'}}>

      <h2>
        Release Notes (v1.0) and Other Info for Admins:
      </h2>

      <p>The biosecurity tool is currently faked (i.e. for Gibson Assembly). For simplicity, its result is based on the first 3 characters of the 'Vector' parameter...</p>
      <ul>
        <li>'CAT' resolves to 'Passed'</li>
        <li>'TAC' resolves to 'Failed'</li>
        <li>'ACT' resolves to 'Error'</li>
        <li>Any other sequence resolves to 'Pending'</li>
      </ul>

      <p>
        Questions?  Contact ckrenz@bu.edu
      </p>

    </div>

  )
}
