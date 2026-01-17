import React from "react";

function ChatsIcon({ img, name, title, onClick }) {
    return (
        <div
            className="flex items-center mx-4 my-5 space-x-4 cursor-pointer"
            onClick={onClick}
        >
            <div className="img h-10 w-10 md:h-12 md:w-12 lg:h-12 lg:w-12 overflow-hidden flex-shrink-0">
                <img
                    src={img}
                    alt={`Profile picture of ${name}`}
                    className="rounded-full object-cover h-full w-full"
                />
            </div>
            <div className="text flex-1">
                <p className="font-semibold text-base md:text-lg lg:text-sm">{name}</p>
                <p className="opacity-70 text-sm md:text-base lg:text-sm font-medium">
                    {title || "I'm whisprr user..."}
                </p>
            </div>
        </div>
    );
}

export default ChatsIcon;