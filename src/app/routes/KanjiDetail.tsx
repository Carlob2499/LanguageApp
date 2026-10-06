import { KanjiStudy } from '@/app/components/KanjiStudy'
import { useParams } from '@/app/router/index'

export function KanjiDetailRoute() {
  const { char = '' } = useParams()
  return <KanjiStudy char={char} />
}
