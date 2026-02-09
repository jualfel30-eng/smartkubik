import React from "react";
import { cn } from "@/lib/utils";

export const Meteors = ({
    number,
    className
}) => {
    const meteors = new Array(number || 20).fill(true);
    return (
        (<span style={{ pointerEvents: 'none' }}>
            {meteors.map((el, idx) => (
                <span
                    key={"meteor" + idx}
                    className={cn(
                        "animate-meteor-custom absolute top-1/2 h-0.5 w-0.5 rounded-[9999px] bg-gray-500 shadow-[0_0_0_1px_#ffffff10]",
                        "before:content-[''] before:absolute before:top-1/2 before:transform before:-translate-y-[50%] before:w-[50px] before:h-[1px] before:bg-gradient-to-r before:from-gray-500 before:to-transparent",
                        className
                    )}
                    style={{
                        top: Math.floor(Math.random() * 100) + "%",
                        left: Math.floor(Math.random() * 100) + "%",
                        animationDelay: Math.random() * (1 - 0.1) + 0.1 + "s",
                        animationDuration: Math.floor(Math.random() * (8 - 2) + 2) + "s",
                    }}></span>
            ))}
        </span>)
    );
};
