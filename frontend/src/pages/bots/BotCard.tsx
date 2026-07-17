import { useNavigate } from 'react-router-dom' // navigate to chat
import { type Bot } from '@services' // Bot entity
import { Btn } from '../../components/ui/button' // action button
import { Card } from '../../components/ui/Card' // card wrapper
import { BotHeader } from './BotHeader' // icon + name + type badge

export function BotCard({ bot }: { bot: Bot }) { // clickable card that navigates to /bots/:id
  const navigate = useNavigate()
  const isCommunicator = bot.type === 'communicator' // communicator bots use primary button
  return (
    <Card className="flex flex-col gap-3 hover:shadow-md transition-shadow">
      <BotHeader bot={bot} />
      <Btn
        className="mt-auto w-full py-2"
        variant={isCommunicator ? 'primary' : 'secondary'}
        onClick={() => navigate(`/bots/${bot.id}`)}
      >
        {isCommunicator ? 'Launch' : 'Open'}
      </Btn>
    </Card>
  )
}
