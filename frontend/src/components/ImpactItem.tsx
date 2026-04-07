import { motion } from 'framer-motion'
import type { components } from '../api/types.generated'

type ImpactItemData = components['schemas']['ImpactItem']

interface ImpactItemProps {
  item: ImpactItemData
  onClick: (item: ImpactItemData) => void
  selected: boolean
}

// FR-9.4: item-level variants for stagger parent (transition set on the element, not here)
export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

export default function ImpactItem({ item, onClick, selected }: ImpactItemProps) {
  const isAffected = item.impact_level === 'affected'

  return (
    <motion.li
      variants={itemVariants}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={() => onClick(item)}
      className={[
        'px-3 py-2.5 rounded-lg border cursor-pointer transition-all list-none',
        isAffected
          ? selected ? 'border-red-300 bg-red-50 shadow-[0_0_0_2px_#ef444433]' : 'border-red-200 bg-white'
          : selected ? 'border-yellow-300 bg-amber-50 shadow-[0_0_0_2px_#f59e0b33]' : 'border-yellow-200 bg-white',
      ].join(' ')}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11px] text-indigo-500 font-bold">
          {item.display_label}
        </span>
        <span className="text-[11px] text-slate-400 flex-1">
          {item.document_filename}
        </span>
        <span
          className={[
            'text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white shrink-0',
            isAffected ? 'bg-red-500' : 'bg-amber-500',
          ].join(' ')}
        >
          {isAffected ? '영향받음' : '검토 권장'}
        </span>
      </div>
      <div className="text-[13px] text-slate-900 font-medium mb-1">
        {item.requirement_title}
      </div>
      {item.evidence && (
        <div className="text-xs text-slate-500 italic">
          "{item.evidence}"
        </div>
      )}
    </motion.li>
  )
}
