import React from 'react'
import img from '../img/img.jpg'

function Description() {
  return (
    <div className='w-[30%] border-2'>
        <div className="photo">
            <img src={img} alt="" className='h-24 w-24 rounded-full ml-16  mt-10' srcset="" />
        </div>
        <div className="name flex flex-col justify-between items-center">
            <p className='font-semibold'>Aarav Singh</p>
            <p className='opacity-50 text-sm'>Active 20m ago</p>
        </div>
        <div className="edit flex flex-col justify-between items-center mt-10">
            <button type="button" className='bg-black text-white rounded-md w-36 h-6 font-normal text-sm'>Edit Profile</button>
        </div>
        <div className="features"></div>

    </div>
  )
}

export default Description