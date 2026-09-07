import { Film } from 'lucide-react'

interface PlaceholderImageProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function PlaceholderImage({ className = '', size = 'md' }: PlaceholderImageProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  return (
    <div className={`bg-gray-800 rounded-lg flex items-center justify-center ${className}`}>
      <Film className={`${sizeClasses[size]} text-gray-600`} />
    </div>
  )
}