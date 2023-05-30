import React from 'react'

export default function ELabs() {

  const handleAuth = () => {

    window.location.href = "https://us.elabjournal.com/members/fn/externalAuth/?rootVar=localhost&state=myOptionalStateString";

  }

  return (
    <div>
      <h2>
        ELabs
      </h2>
      <button onClick={handleAuth}>Login</button>
    </div>
  )
}
