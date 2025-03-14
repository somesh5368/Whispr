import React, { useState } from 'react';
import { SlMagnifier } from "react-icons/sl";

const Search = () => {
    const [query, setQuery] = useState('');



    return (
        <div className='flex justify-items-start mx-3 rounded-lg border-2 items-center  mt-2'>
            <span className='mr-2 pt-2 pl-3 opacity-50 text-[15px]'><SlMagnifier /></span>
            <input 
                type="text" 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 

                placeholder="Search chats" 
                className='placeholder:text-[12px] placeholder:pt-[-3px]'
            />
           
        </div>
    );
};

export default Search;