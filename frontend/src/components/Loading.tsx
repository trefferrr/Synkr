import React from 'react'

const Loading = () => {
  return (
    <div className='fixex inset-0 flex items-center justify-center bg-gray-900 min-h-screen'>
        <div className="h-12 w-12s border-4 border-white border-t-transparent rounded-full animate-spin"/>
     <p className='text-white p-2'>Loading...</p>
    </div>
  )
}

export default Loading
