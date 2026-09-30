import { createId } from '../domain/factories'
import type { PollWidget, PresentationElement } from '../domain/types'

export function createPoll(): PollWidget {
  return {
    id: createId(), question: 'Wie schätzt ihr das ein?', type: 'yes-no', template: 'karten', colorSet: 'ozean',
    options: [{ id: createId(), label: 'Ja' }, { id: createId(), label: 'Nein' }],
  }
}

export function createPollElement(position = { x: 260, y: 170 }): PresentationElement {
  const timestamp = new Date().toISOString()
  return {
    id: createId(), type: 'poll', x: position.x, y: position.y, width: 760, height: 380, rotation: 0, zIndex: 1,
    style: { opacity: 1 }, content: { poll: createPoll() }, createdAt: timestamp, updatedAt: timestamp,
  }
}

export function duplicatePoll(poll: PollWidget): PollWidget {
  return { ...poll, id: createId(), options: poll.options.map((option) => ({ ...option, id: createId() })) }
}
