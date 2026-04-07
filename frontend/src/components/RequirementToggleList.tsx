import type { components } from '../api/types.generated'

type Requirement = components['schemas']['Requirement']

interface RequirementToggleListProps {
  requirements: Requirement[]
  documents: Record<string, string> // id → filename
  onToggle: (req: Requirement, changed: boolean) => void
}

export default function RequirementToggleList({
  requirements,
  documents,
  onToggle,
}: RequirementToggleListProps) {
  if (requirements.length === 0) {
    return (
      <div className="text-[13px] text-slate-400 text-center py-4">
        요구사항이 없습니다
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {requirements.map((req) => (
        <div
          key={req.id}
          className={[
            'flex items-center gap-3 px-3 py-2 rounded-lg border transition-all',
            req.changed ? 'border-orange-200 bg-orange-50' : 'border-slate-200 bg-white',
          ].join(' ')}
        >
          {/* Custom toggle switch */}
          <button
            role="switch"
            aria-checked={req.changed ?? false}
            onClick={() => onToggle(req, !(req.changed ?? false))}
            className={[
              'relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 shrink-0 border-none cursor-pointer',
              req.changed ? 'bg-orange-500' : 'bg-slate-300',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                req.changed ? 'translate-x-4' : 'translate-x-0.5',
              ].join(' ')}
            />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] text-indigo-500 font-bold">
                {req.display_label}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                {documents[req.location.document_id] ?? req.location.document_id}
              </span>
              {req.changed && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500 text-white font-bold ml-auto shrink-0">
                  변경 예정
                </span>
              )}
            </div>
            <div className="text-[13px] text-slate-700 truncate">
              {req.title}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
