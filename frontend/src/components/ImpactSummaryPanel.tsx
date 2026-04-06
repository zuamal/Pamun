import { useState } from 'react'
import { motion } from 'framer-motion'
import type { components } from '../api/types.generated'
import ImpactItem from './ImpactItem'

type ImpactResult = components['schemas']['ImpactResult']
type ImpactItemData = components['schemas']['ImpactItem']

interface ImpactSummaryPanelProps {
  result: ImpactResult
  selectedItemId: string | null
  onItemClick: (item: ImpactItemData) => void
}

type Tab = 'affected' | 'review'

export default function ImpactSummaryPanel({
  result,
  selectedItemId,
  onItemClick,
}: ImpactSummaryPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('affected')

  const { affected_items, review_items } = result
  const items = activeTab === 'affected' ? affected_items : review_items

  return (
    <motion.div
      className="border-t border-slate-200 bg-white flex flex-col shrink-0"
      style={{ height: '33%', minHeight: 160, maxHeight: 320 }}
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Panel header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-200 shrink-0">
        <span className="text-[13px] font-semibold text-slate-800">
          영향받음&nbsp;
          <span className="text-red-600 font-bold">{affected_items.length}개</span>
          &nbsp;·&nbsp;검토 권장&nbsp;
          <span className="text-amber-600 font-bold">{review_items.length}개</span>
        </span>

        {/* Tabs */}
        <div className="flex ml-auto gap-1">
          <button
            onClick={() => setActiveTab('affected')}
            className={[
              'px-3 py-1 rounded-md text-[12px] font-semibold transition-colors cursor-pointer border-none',
              activeTab === 'affected'
                ? 'bg-red-100 text-red-700'
                : 'bg-transparent text-slate-500 hover:bg-slate-100',
            ].join(' ')}
          >
            영향받음 ({affected_items.length})
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={[
              'px-3 py-1 rounded-md text-[12px] font-semibold transition-colors cursor-pointer border-none',
              activeTab === 'review'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-transparent text-slate-500 hover:bg-slate-100',
            ].join(' ')}
          >
            검토 권장 ({review_items.length})
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="text-[13px] text-slate-400 text-center py-4">
            {activeTab === 'affected' ? '영향받는 요구사항 없음' : '검토 권장 요구사항 없음'}
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
            {items.map((item) => (
              <ImpactItem
                key={item.requirement_id}
                item={item}
                selected={selectedItemId === item.requirement_id}
                onClick={onItemClick}
              />
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  )
}
