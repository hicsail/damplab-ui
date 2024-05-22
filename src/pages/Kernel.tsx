import React from 'react'


export default function Kernel() {

  const handleAuth = () => {

    window.location.href = "https://auth.kernel.asimov.com/";

  }

  return (

    <div>

      <h2>
        Kernel (by Asimov)
      </h2>

      <p>
        Kernel contains a tool for performing a biosecurity screening on a sequence.
      </p>

      <button onClick={handleAuth}>
        Visit Kernel
      </button>

    </div>

  )
}
