import { useEffect, useState } from 'react'
import { listRequirements } from '../api/requirements'
import { listEdges } from '../api/edges'
import { listDocuments } from '../api/documents'
import { useGraphStore } from '../stores/graphStore'
import { useDocumentStore } from '../stores/documentStore'

export function useHydrate() {
  const [hydrating, setHydrating] = useState(true)
  const { setRequirements, setEdges } = useGraphStore()
  const { setDocuments } = useDocumentStore()

  useEffect(() => {
    void Promise.all([
      listRequirements().catch(() => [] as Awaited<ReturnType<typeof listRequirements>>),
      listEdges().catch(() => ({ edges: [] }) as Awaited<ReturnType<typeof listEdges>>),
      listDocuments().catch(() => ({ documents: [] }) as Awaited<ReturnType<typeof listDocuments>>),
    ]).then(([reqs, edgeRes, docRes]) => {
      setRequirements(reqs)
      setEdges(edgeRes.edges)
      setDocuments(docRes.documents)
    }).finally(() => {
      setHydrating(false)
    })
  }, [setRequirements, setEdges, setDocuments])

  return { hydrating }
}
