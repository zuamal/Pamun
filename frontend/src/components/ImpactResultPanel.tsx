import { motion } from 'framer-motion'
import type { components } from '../api/types.generated'
import ImpactItem from './ImpactItem'

type ImpactResult = components['schemas']['ImpactResult']
type ImpactItemData = components['schemas']['ImpactItem']

interface ImpactResultPanelProps {
  result: ImpactResult
  selectedItemId: string | null
  onItemClick: (item: ImpactItemData) => void
}

// FR-9.4: container stagger — triggers re-run when the key changes
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

export default function ImpactResultPanel({
  result,
  selectedItemId,
  onItemClick,
}: ImpactResultPanelProps) {
  const { affected_items, review_items } = result

  // Use a stable key based on the result to retrigger stagger on every new analysis
  const resultKey = JSON.stringify({ a: affected_items.length, r: review_items.length })

  return (
    <div className="flex flex-col gap-6">
      {/* Affected section */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
          <span className="font-bold text-[14px] text-red-600">
            영향받음 (Affected)
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
            {affected_items.length}개
          </span>
        </div>

        {affected_items.length === 0 ? (
          <div className="text-[13px] text-slate-400 py-2">
            영향받는 요구사항 없음
          </div>
        ) : (
          <motion.ul
            key={`affected-${resultKey}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-1.5 list-none p-0 m-0"
          >
            {affected_items.map((item) => (
              <ImpactItem
                key={item.requirement_id}
                item={item}
                selected={selectedItemId === item.requirement_id}
                onClick={onItemClick}
              />
            ))}
          </motion.ul>
        )}
      </div>

      {/* Review recommended section */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <span className="font-bold text-[14px] text-amber-700">
            검토 권장 (Review Recommended)
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-yellow-200">
            {review_items.length}개
          </span>
        </div>

        {review_items.length === 0 ? (
          <div className="text-[13px] text-slate-400 py-2">
            검토 권장 요구사항 없음
          </div>
        ) : (
          <motion.ul
            key={`review-${resultKey}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-1.5 list-none p-0 m-0"
          >
            {review_items.map((item) => (
              <ImpactItem
                key={item.requirement_id}
                item={item}
                selected={selectedItemId === item.requirement_id}
                onClick={onItemClick}
              />
            ))}
          </motion.ul>
        )}
      </div>
    </div>
  )
}
