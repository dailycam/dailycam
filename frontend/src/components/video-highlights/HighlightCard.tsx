import { Play, Download, Share2, Clock, MapPin, AlertTriangle } from 'lucide-react'

interface HighlightCardProps {
  id: string
  title: string
  timestamp: string
  duration: string
  location: string
  severity: 'high' | 'medium' | 'low'
  thumbnailUrl?: string
  description: string
  onPlay: () => void
}

export default function HighlightCard({
  title,
  timestamp,
  duration,
  location,
  severity,
  thumbnailUrl,
  description,
  onPlay,
}: HighlightCardProps) {
  const severityConfig = {
    high: {
      badge: 'bg-danger text-white',
      border: 'border-danger-200',
      label: '높음',
    },
    medium: {
      badge: 'bg-warning text-white',
      border: 'border-warning-200',
      label: '중간',
    },
    low: {
      badge: 'bg-gray-400 text-white',
      border: 'border-gray-200',
      label: '낮음',
    },
  }

  const config = severityConfig[severity]

  return (
    <div className={`card border-2 ${config.border} hover:shadow-lg transition-all duration-200 group`}>
      {/* Thumbnail with Play Button */}
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">하이라이트 영상</p>
            </div>
          </div>
        )}
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={onPlay}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform shadow-xl"
          >
            <Play className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" />
          </button>
        </div>

        {/* Duration Badge */}
        <div className="absolute top-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded">
          {duration}
        </div>

        {/* Severity Badge */}
        <div className="absolute top-3 left-3">
          <span className={`text-xs px-2 py-1 rounded font-medium ${config.badge}`}>
            위험도: {config.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{timestamp}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{location}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onPlay}
            className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            재생
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Download className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Share2 className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  )
}

