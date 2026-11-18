import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

interface UserAvatarProps {
  src: string;
  alt?: string;
  className?: string;
  verified?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  alt = "Avatar",
  className = "w-10 h-10",
  verified = true
}) => {
  return (
    <div className={cn("relative w-fit flex-shrink-0", className)}>
      <div className="w-full h-full rounded-full ring-offset-background ring-2 ring-teal-600 ring-offset-2 dark:ring-teal-400 overflow-hidden bg-white">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>
      {verified && (
        <span className="absolute -right-1.5 -bottom-1.5 inline-flex h-[40%] w-[40%] min-h-[14px] min-w-[14px] items-center justify-center rounded-full bg-teal-600 dark:bg-teal-400 border-2 border-white dark:border-gray-800">
          <Check className="h-[75%] w-[75%] text-white" strokeWidth={4} />
        </span>
      )}
    </div>
  );
};
