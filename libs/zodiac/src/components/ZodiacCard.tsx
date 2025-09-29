import React from 'react'
import { Play, Calendar, Clock } from 'lucide-react'
import { Card, CardContent, Badge } from '@samia-tarot/ui-kit'
import { getZodiacInfo } from '../utils/zodiac-info'
import { getKSADate } from '../utils/ksa-time'

export interface ZodiacCardProps {
  sign: string
  textContent: string
  hasAudio?: boolean
  audioDuration?: number
  date?: string
  className?: string
  onClick?: () => void
}

export const ZodiacCard: React.FC<ZodiacCardProps> = ({
  sign,
  textContent,
  hasAudio = false,
  audioDuration,
  date,
  className,
  onClick
}) => {
  const zodiacInfo = getZodiacInfo(sign)
  const displayDate = date || getKSADate()

  return (
    <Card
      variant="cosmic"
      interactive
      className={className}
      onClick={onClick}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">
              {zodiacInfo.symbol}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {zodiacInfo.nameAr}
              </h3>
              <p className="text-purple-200 text-sm">
                {zodiacInfo.nameEn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-purple-200">
            <Calendar className="h-4 w-4" />
            <span>{displayDate}</span>
          </div>
        </div>

        {/* Content Preview */}
        <div className="mb-4">
          <p className="text-purple-100 text-sm leading-relaxed line-clamp-3">
            {textContent}
          </p>
        </div>

        {/* Audio Info */}
        {hasAudio && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-purple-300" />
              <span className="text-purple-200 text-sm">
                التسجيل الصوتي متاح
              </span>
            </div>

            {audioDuration && (
              <div className="flex items-center gap-1 text-purple-300">
                <Clock className="h-3 w-3" />
                <span className="text-xs">
                  {Math.ceil(audioDuration / 60)} دقائق
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tap hint */}
        <div className="mt-4 pt-4 border-t border-purple-500">
          <p className="text-center text-purple-300 text-xs">
            اضغط لقراءة التفاصيل
          </p>
        </div>
      </CardContent>
    </Card>
  )
}