"use client"

import { Progress } from "@/components/ui/progress"

interface IndicatorProgressProps {
  data: { name: string; target: number; achieved: number }[]
}

export function IndicatorProgress({ data }: IndicatorProgressProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">Indicator Progress</h3>
      <div className="space-y-6">
        {data.map((item) => {
          const percentage = Math.round((item.achieved / item.target) * 100)
          return (
            <div key={item.name} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-card-foreground">{item.name}</span>
                <span className="text-muted-foreground">
                  {item.achieved.toLocaleString()} / {item.target.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={percentage} className="flex-1" />
                <span className="w-12 text-right text-sm font-medium text-card-foreground">
                  {percentage}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
