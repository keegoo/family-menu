import { useParams } from 'react-router'

export default function Dish() {
  const { id } = useParams()
  return <p> dish { id } - detail page comes soon</p>
}
